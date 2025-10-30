import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecretsManagerService } from './secrets-manager.service';

/**
 * Global module for AWS Secrets Manager integration
 *
 * This module provides centralized secret management with:
 * - Secure retrieval from AWS Secrets Manager
 * - In-memory caching with TTL (5 minutes)
 * - Automatic fallback to environment variables
 * - Retry logic with exponential backoff
 * - Audit logging for secret access
 *
 * Usage:
 * 1. Enable in .env: AWS_SECRETS_MANAGER_ENABLED=true
 * 2. Configure AWS region: AWS_REGION=us-east-1
 * 3. Set secret prefix: SECRET_NAME_PREFIX=ai-affiliate-empire
 * 4. In services, inject SecretsManagerService and call:
 *    const apiKey = await this.secretsManager.getSecret('openai-api-key', 'OPENAI_API_KEY');
 *
 * Security:
 * - Uses IAM roles for authentication in production
 * - Never logs secret values
 * - Implements secret rotation support via cache invalidation
 * - Audit logs all secret access attempts
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [SecretsManagerService],
  exports: [SecretsManagerService],
})
export class SecretsManagerModule {}
