import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandInput,
} from '@aws-sdk/client-secrets-manager';

interface CachedSecret {
  value: string;
  expiresAt: number;
}

interface SecretCache {
  [key: string]: CachedSecret;
}

@Injectable()
export class SecretsManagerService implements OnModuleInit {
  private readonly logger = new Logger(SecretsManagerService.name);
  private readonly client: SecretsManagerClient | null;
  private readonly enabled: boolean;
  private readonly region: string;
  private readonly secretPrefix: string;
  private readonly cacheTTL: number = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly cache: SecretCache = {};
  private readonly maxRetries = 3;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get('AWS_SECRETS_MANAGER_ENABLED') === 'true';
    this.region = this.config.get('AWS_REGION') || 'us-east-1';
    this.secretPrefix = this.config.get('SECRET_NAME_PREFIX') || 'ai-affiliate-empire';

    if (this.enabled) {
      this.client = new SecretsManagerClient({
        region: this.region,
        // In production, use IAM roles for authentication
        // AWS SDK will automatically use IAM role credentials
        maxAttempts: this.maxRetries,
      });
      this.logger.log(
        `AWS Secrets Manager enabled - Region: ${this.region}, Prefix: ${this.secretPrefix}`,
      );
    } else {
      this.client = null;
      this.logger.warn('AWS Secrets Manager disabled - Using environment variables');
    }
  }

  async onModuleInit() {
    if (this.enabled && this.client) {
      // Test connection on startup
      try {
        await this.testConnection();
        this.logger.log('AWS Secrets Manager connection verified');
      } catch (error) {
        this.logger.error('Failed to connect to AWS Secrets Manager', error);
        this.logger.warn('Falling back to environment variables');
      }
    }
  }

  /**
   * Get secret value with caching and fallback to environment variables
   * @param secretName - Name of the secret (without prefix)
   * @param envVarName - Optional environment variable name for fallback
   * @returns Secret value or null if not found
   */
  async getSecret(secretName: string, envVarName?: string): Promise<string | null> {
    // Fallback to environment variable if Secrets Manager is disabled
    if (!this.enabled || !this.client) {
      return this.getFromEnv(envVarName || secretName);
    }

    try {
      // Check cache first
      const cached = this.getFromCache(secretName);
      if (cached) {
        return cached;
      }

      // Fetch from AWS Secrets Manager
      const secretValue = await this.fetchFromAWS(secretName);

      if (secretValue) {
        // Cache the secret
        this.setCache(secretName, secretValue);
        return secretValue;
      }

      // Fallback to environment variable if secret not found
      this.logger.warn(`Secret '${secretName}' not found in AWS, falling back to env var`);
      return this.getFromEnv(envVarName || secretName);
    } catch (error) {
      this.logger.error(`Error fetching secret '${secretName}':`, error);

      // Audit log for failed secret access
      this.auditLog('ERROR', secretName, 'Failed to fetch secret');

      // Fallback to environment variable on error
      return this.getFromEnv(envVarName || secretName);
    }
  }

  /**
   * Get multiple secrets at once
   * @param secretNames - Array of secret names with optional env var fallbacks
   * @returns Object with secret values
   */
  async getSecrets(
    secretNames: Array<{ secretName: string; envVarName?: string }>,
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};

    await Promise.all(
      secretNames.map(async ({ secretName, envVarName }) => {
        results[secretName] = await this.getSecret(secretName, envVarName);
      }),
    );

    return results;
  }

  /**
   * Clear cache for a specific secret or all secrets
   * @param secretName - Optional secret name to clear, or clear all if not provided
   */
  clearCache(secretName?: string): void {
    if (secretName) {
      delete this.cache[secretName];
      this.logger.debug(`Cache cleared for secret: ${secretName}`);
    } else {
      Object.keys(this.cache).forEach((key) => delete this.cache[key]);
      this.logger.debug('All secret cache cleared');
    }
  }

  /**
   * Fetch secret from AWS Secrets Manager with retry logic
   */
  private async fetchFromAWS(secretName: string): Promise<string | null> {
    const fullSecretName = `${this.secretPrefix}/${secretName}`;

    const input: GetSecretValueCommandInput = {
      SecretId: fullSecretName,
    };

    const command = new GetSecretValueCommand(input);

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client!.send(command);

        // Audit log for successful access
        this.auditLog('SUCCESS', secretName, 'Secret accessed successfully');

        // Secret can be in SecretString or SecretBinary
        if (response.SecretString) {
          // Try to parse as JSON first (for complex secrets)
          try {
            const parsed = JSON.parse(response.SecretString);
            // If it's a JSON object with a 'value' key, return that
            if (parsed.value) {
              return parsed.value;
            }
            // Otherwise return the whole JSON as string
            return response.SecretString;
          } catch {
            // Not JSON, return as-is
            return response.SecretString;
          }
        }

        if (response.SecretBinary) {
          // Convert binary to string
          return Buffer.from(response.SecretBinary).toString('utf-8');
        }

        return null;
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (
          error.name === 'ResourceNotFoundException' ||
          error.name === 'InvalidParameterException' ||
          error.name === 'AccessDeniedException'
        ) {
          this.logger.warn(`Secret '${fullSecretName}' not accessible: ${error.message}`);
          break;
        }

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          this.logger.warn(
            `Retry ${attempt}/${this.maxRetries} for secret '${secretName}' after ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    return null;
  }

  /**
   * Get secret from cache if not expired
   */
  private getFromCache(secretName: string): string | null {
    const cached = this.cache[secretName];
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now > cached.expiresAt) {
      // Cache expired
      delete this.cache[secretName];
      return null;
    }

    this.logger.debug(`Cache hit for secret: ${secretName}`);
    return cached.value;
  }

  /**
   * Store secret in cache with TTL
   */
  private setCache(secretName: string, value: string): void {
    this.cache[secretName] = {
      value,
      expiresAt: Date.now() + this.cacheTTL,
    };
  }

  /**
   * Get secret from environment variable
   */
  private getFromEnv(envVarName: string): string | null {
    const value = this.config.get(envVarName);
    if (value) {
      this.logger.debug(`Using environment variable: ${envVarName}`);
    }
    return value || null;
  }

  /**
   * Test connection to AWS Secrets Manager
   */
  private async testConnection(): Promise<void> {
    // Try to get a test secret (can be any secret)
    const testSecretName = `${this.secretPrefix}/health-check`;
    try {
      const command = new GetSecretValueCommand({
        SecretId: testSecretName,
      });
      await this.client!.send(command);
    } catch (error: any) {
      // It's OK if the health check secret doesn't exist
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }
  }

  /**
   * Audit log for secret access
   * In production, this should be sent to a proper audit logging system
   */
  private auditLog(level: 'SUCCESS' | 'ERROR', secretName: string, message: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      secretName: `${this.secretPrefix}/${secretName}`,
      message,
      // NEVER log the actual secret value
    };

    if (level === 'SUCCESS') {
      this.logger.debug(`[AUDIT] ${JSON.stringify(logEntry)}`);
    } else {
      this.logger.warn(`[AUDIT] ${JSON.stringify(logEntry)}`);
    }
  }

  /**
   * Check if Secrets Manager is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }
}
