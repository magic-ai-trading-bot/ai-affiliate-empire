#!/usr/bin/env ts-node

/**
 * Migration Script: Upload Secrets to AWS Secrets Manager
 *
 * This script reads secrets from your .env file and uploads them to AWS Secrets Manager.
 * It's designed to be run once during initial setup or when rotating credentials.
 *
 * Prerequisites:
 * 1. AWS CLI configured with appropriate credentials
 * 2. IAM permissions to create/update secrets in AWS Secrets Manager
 * 3. .env file with all required secrets
 *
 * Usage:
 *   ts-node scripts/migrate-secrets-to-aws.ts
 *
 * Or with npm:
 *   npm run migrate:secrets
 *
 * Security Notes:
 * - This script does NOT log secret values
 * - Ensure your terminal history is disabled or cleared after running
 * - Consider deleting this script after migration in production
 * - Use AWS IAM roles for authentication in production (not access keys)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SecretsManagerClient,
  CreateSecretCommand,
  UpdateSecretCommand,
  DescribeSecretCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-secrets-manager';
import * as dotenv from 'dotenv';

// Configuration
const ENV_FILE = path.join(__dirname, '..', '.env');
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SECRET_PREFIX = process.env.SECRET_NAME_PREFIX || 'ai-affiliate-empire';

// Mapping of environment variable names to AWS secret names
const SECRET_MAPPINGS = [
  {
    envVar: 'OPENAI_API_KEY',
    secretName: 'openai-api-key',
    description: 'OpenAI API key for GPT models',
  },
  {
    envVar: 'ELEVENLABS_API_KEY',
    secretName: 'elevenlabs-api-key',
    description: 'ElevenLabs API key for voice generation',
  },
  {
    envVar: 'PIKALABS_API_KEY',
    secretName: 'pikalabs-api-key',
    description: 'Pika Labs API key for video generation',
  },
  {
    envVar: 'AMAZON_ACCESS_KEY',
    secretName: 'amazon-access-key',
    description: 'Amazon PA-API access key',
  },
  {
    envVar: 'AMAZON_SECRET_KEY',
    secretName: 'amazon-secret-key',
    description: 'Amazon PA-API secret key',
  },
  {
    envVar: 'AMAZON_PARTNER_TAG',
    secretName: 'amazon-partner-tag',
    description: 'Amazon Associates partner tag',
  },
  {
    envVar: 'YOUTUBE_CLIENT_ID',
    secretName: 'youtube-client-id',
    description: 'YouTube OAuth client ID',
  },
  {
    envVar: 'YOUTUBE_CLIENT_SECRET',
    secretName: 'youtube-client-secret',
    description: 'YouTube OAuth client secret',
  },
  {
    envVar: 'TIKTOK_CLIENT_KEY',
    secretName: 'tiktok-client-key',
    description: 'TikTok API client key',
  },
  {
    envVar: 'TIKTOK_CLIENT_SECRET',
    secretName: 'tiktok-client-secret',
    description: 'TikTok API client secret',
  },
  {
    envVar: 'INSTAGRAM_ACCESS_TOKEN',
    secretName: 'instagram-access-token',
    description: 'Instagram Graph API access token',
  },
  {
    envVar: 'INSTAGRAM_BUSINESS_ACCOUNT_ID',
    secretName: 'instagram-business-account-id',
    description: 'Instagram Business account ID',
  },
  {
    envVar: 'SHARESALE_API_TOKEN',
    secretName: 'sharesale-api-token',
    description: 'ShareASale API token',
  },
  {
    envVar: 'SHARESALE_API_SECRET',
    secretName: 'sharesale-api-secret',
    description: 'ShareASale API secret',
  },
  { envVar: 'CJ_API_KEY', secretName: 'cj-api-key', description: 'CJ Affiliate API key' },
  {
    envVar: 'R2_ACCESS_KEY_ID',
    secretName: 'r2-access-key-id',
    description: 'Cloudflare R2 access key ID',
  },
  {
    envVar: 'R2_SECRET_ACCESS_KEY',
    secretName: 'r2-secret-access-key',
    description: 'Cloudflare R2 secret access key',
  },
  { envVar: 'JWT_SECRET', secretName: 'jwt-secret', description: 'JWT signing secret' },
  { envVar: 'ENCRYPTION_KEY', secretName: 'encryption-key', description: 'AES-256 encryption key' },
];

interface MigrationResult {
  secretName: string;
  status: 'created' | 'updated' | 'skipped' | 'error';
  message: string;
}

class SecretsMigrator {
  private client: SecretsManagerClient;
  private envVars: Record<string, string>;

  constructor() {
    this.client = new SecretsManagerClient({
      region: AWS_REGION,
    });
    this.envVars = {};
  }

  /**
   * Load environment variables from .env file
   */
  loadEnvFile(): void {
    if (!fs.existsSync(ENV_FILE)) {
      throw new Error(`Environment file not found: ${ENV_FILE}`);
    }

    const envConfig = dotenv.parse(fs.readFileSync(ENV_FILE));
    this.envVars = envConfig;

    console.log(`✅ Loaded ${Object.keys(envConfig).length} environment variables from .env`);
  }

  /**
   * Check if a secret already exists in AWS Secrets Manager
   */
  async secretExists(secretName: string): Promise<boolean> {
    try {
      await this.client.send(
        new DescribeSecretCommand({
          SecretId: `${SECRET_PREFIX}/${secretName}`,
        }),
      );
      return true;
    } catch (error: any) {
      if (error instanceof ResourceNotFoundException) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a new secret in AWS Secrets Manager
   */
  async createSecret(secretName: string, secretValue: string, description: string): Promise<void> {
    const fullSecretName = `${SECRET_PREFIX}/${secretName}`;

    await this.client.send(
      new CreateSecretCommand({
        Name: fullSecretName,
        Description: description,
        SecretString: secretValue,
        Tags: [
          { Key: 'Project', Value: 'ai-affiliate-empire' },
          { Key: 'ManagedBy', Value: 'migration-script' },
          { Key: 'Environment', Value: process.env.NODE_ENV || 'production' },
        ],
      }),
    );

    console.log(`  ✅ Created: ${fullSecretName}`);
  }

  /**
   * Update an existing secret in AWS Secrets Manager
   */
  async updateSecret(secretName: string, secretValue: string): Promise<void> {
    const fullSecretName = `${SECRET_PREFIX}/${secretName}`;

    await this.client.send(
      new UpdateSecretCommand({
        SecretId: fullSecretName,
        SecretString: secretValue,
      }),
    );

    console.log(`  ✅ Updated: ${fullSecretName}`);
  }

  /**
   * Migrate a single secret
   */
  async migrateSecret(
    envVar: string,
    secretName: string,
    description: string,
  ): Promise<MigrationResult> {
    const secretValue = this.envVars[envVar];

    // Skip if environment variable is not set or empty
    if (!secretValue || secretValue.trim() === '') {
      return {
        secretName,
        status: 'skipped',
        message: `Environment variable ${envVar} not set`,
      };
    }

    // Skip mock values
    if (secretValue.includes('...') || secretValue.includes('your-')) {
      return {
        secretName,
        status: 'skipped',
        message: 'Placeholder value detected',
      };
    }

    try {
      const exists = await this.secretExists(secretName);

      if (exists) {
        // Ask for confirmation to update existing secret
        console.log(`  ⚠️  Secret '${secretName}' already exists. Updating...`);
        await this.updateSecret(secretName, secretValue);
        return {
          secretName,
          status: 'updated',
          message: 'Successfully updated',
        };
      } else {
        await this.createSecret(secretName, secretValue, description);
        return {
          secretName,
          status: 'created',
          message: 'Successfully created',
        };
      }
    } catch (error: any) {
      console.error(`  ❌ Error migrating ${secretName}:`, error.message);
      return {
        secretName,
        status: 'error',
        message: error.message,
      };
    }
  }

  /**
   * Migrate all secrets
   */
  async migrateAll(): Promise<void> {
    console.log(`\n🚀 Starting secret migration to AWS Secrets Manager`);
    console.log(`   Region: ${AWS_REGION}`);
    console.log(`   Prefix: ${SECRET_PREFIX}\n`);

    const results: MigrationResult[] = [];

    for (const mapping of SECRET_MAPPINGS) {
      console.log(`\n📦 Processing: ${mapping.envVar} → ${mapping.secretName}`);
      const result = await this.migrateSecret(
        mapping.envVar,
        mapping.secretName,
        mapping.description,
      );
      results.push(result);
    }

    // Print summary
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('                   MIGRATION SUMMARY                    ');
    console.log('═══════════════════════════════════════════════════════\n');

    const created = results.filter((r) => r.status === 'created').length;
    const updated = results.filter((r) => r.status === 'updated').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const errors = results.filter((r) => r.status === 'error').length;

    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors:  ${errors}`);

    if (errors > 0) {
      console.log('\n⚠️  Errors occurred during migration:');
      results
        .filter((r) => r.status === 'error')
        .forEach((r) => {
          console.log(`   - ${r.secretName}: ${r.message}`);
        });
    }

    if (skipped > 0) {
      console.log('\n⏭️  Skipped secrets:');
      results
        .filter((r) => r.status === 'skipped')
        .forEach((r) => {
          console.log(`   - ${r.secretName}: ${r.message}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    // Next steps
    console.log('📋 Next Steps:\n');
    console.log('1. Update .env file:');
    console.log('   AWS_SECRETS_MANAGER_ENABLED=true');
    console.log(`   AWS_REGION=${AWS_REGION}`);
    console.log(`   SECRET_NAME_PREFIX=${SECRET_PREFIX}\n`);
    console.log('2. Restart your application to use AWS Secrets Manager\n');
    console.log('3. Verify secrets are being loaded correctly\n');
    console.log('4. Consider setting up secret rotation policies in AWS\n');
    console.log('5. (Optional) Remove sensitive values from .env file\n');

    console.log('⚠️  Security Reminder:');
    console.log('   - Clear your terminal history');
    console.log('   - Ensure IAM roles are properly configured');
    console.log('   - Enable CloudTrail for audit logging');
    console.log('   - Set up secret rotation schedules\n');
  }
}

// Main execution
async function main() {
  try {
    const migrator = new SecretsMigrator();
    migrator.loadEnvFile();
    await migrator.migrateAll();

    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { SecretsMigrator };
