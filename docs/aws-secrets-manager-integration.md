# AWS Secrets Manager Integration

## Overview

This document describes the AWS Secrets Manager integration implemented for secure credential management in the AI Affiliate Empire application.

## Architecture

### Components

1. **SecretsManagerService** (`src/common/secrets/secrets-manager.service.ts`)
   - Core service for retrieving secrets from AWS Secrets Manager
   - Implements caching with 5-minute TTL
   - Automatic fallback to environment variables
   - Retry logic with exponential backoff
   - Audit logging for compliance

2. **SecretsManagerModule** (`src/common/secrets/secrets-manager.module.ts`)
   - Global NestJS module
   - Exports SecretsManagerService for application-wide use

3. **Migration Script** (`scripts/migrate-secrets-to-aws.ts`)
   - Automated tool to upload secrets from .env to AWS
   - Supports both creation and updates
   - Safe handling of secret values (no logging)

## Features

### Security Features

- **No Secret Logging**: Secret values are never logged or exposed
- **IAM Role Authentication**: Uses AWS IAM roles in production (no hardcoded credentials)
- **Audit Logging**: All secret access attempts are logged for compliance
- **Encryption at Rest**: AWS Secrets Manager encrypts all secrets
- **Secret Rotation Support**: Cache invalidation enables secret rotation

### Operational Features

- **Caching**: In-memory cache with 5-minute TTL reduces API calls
- **Fallback**: Automatic fallback to environment variables in development
- **Retry Logic**: Exponential backoff on transient failures
- **Error Handling**: Graceful degradation on AWS connectivity issues
- **Connection Test**: Validates AWS connection on service initialization

## Configuration

### Environment Variables

Add to `.env`:

```env
# AWS Secrets Manager Configuration
AWS_SECRETS_MANAGER_ENABLED=true
AWS_REGION=us-east-1
SECRET_NAME_PREFIX=ai-affiliate-empire
```

### Secret Naming Convention

Secrets are stored with the pattern: `{SECRET_NAME_PREFIX}/{secret-name}`

Example: `ai-affiliate-empire/openai-api-key`

## Supported Secrets

The following secrets are managed by AWS Secrets Manager:

### AI Services
- `openai-api-key` - OpenAI API key for GPT models
- `elevenlabs-api-key` - ElevenLabs API key for voice generation
- `pikalabs-api-key` - Pika Labs API key for video generation

### Affiliate Networks
- `amazon-access-key` - Amazon PA-API access key
- `amazon-secret-key` - Amazon PA-API secret key
- `amazon-partner-tag` - Amazon Associates partner tag
- `sharesale-api-token` - ShareASale API token
- `sharesale-api-secret` - ShareASale API secret
- `cj-api-key` - CJ Affiliate API key

### Social Media Platforms
- `youtube-client-id` - YouTube OAuth client ID
- `youtube-client-secret` - YouTube OAuth client secret
- `tiktok-client-key` - TikTok API client key
- `tiktok-client-secret` - TikTok API client secret
- `instagram-access-token` - Instagram Graph API access token
- `instagram-business-account-id` - Instagram Business account ID

### Storage & Security
- `r2-access-key-id` - Cloudflare R2 access key ID
- `r2-secret-access-key` - Cloudflare R2 secret access key
- `jwt-secret` - JWT signing secret
- `encryption-key` - AES-256 encryption key

## Usage

### Migration to AWS Secrets Manager

```bash
# 1. Configure AWS credentials
aws configure

# 2. Run migration script
npm run migrate:secrets

# 3. Enable Secrets Manager
# Edit .env and set AWS_SECRETS_MANAGER_ENABLED=true

# 4. Restart application
npm run start:prod
```

### Development vs Production

**Development Mode** (AWS_SECRETS_MANAGER_ENABLED=false):
- Reads secrets from `.env` file
- No AWS connection required
- Fast startup time

**Production Mode** (AWS_SECRETS_MANAGER_ENABLED=true):
- Reads secrets from AWS Secrets Manager
- Falls back to `.env` if AWS unavailable
- Requires AWS credentials/IAM role

### Accessing Secrets in Services

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { SecretsManagerService } from '../common/secrets/secrets-manager.service';

@Injectable()
export class MyService implements OnModuleInit {
  private apiKey: string = '';

  constructor(private readonly secretsManager: SecretsManagerService) {}

  async onModuleInit() {
    // Retrieve secret with fallback to environment variable
    this.apiKey = await this.secretsManager.getSecret(
      'my-api-key',           // AWS secret name
      'MY_API_KEY'            // Env var fallback
    );
  }
}
```

### Retrieving Multiple Secrets

```typescript
const secrets = await this.secretsManager.getSecrets([
  { secretName: 'api-key-1', envVarName: 'API_KEY_1' },
  { secretName: 'api-key-2', envVarName: 'API_KEY_2' },
]);

const apiKey1 = secrets['api-key-1'];
const apiKey2 = secrets['api-key-2'];
```

## IAM Permissions

### Required IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:ai-affiliate-empire/*"
    }
  ]
}
```

### For Migration Script (Additional Permissions)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:CreateSecret",
        "secretsmanager:UpdateSecret",
        "secretsmanager:TagResource"
      ],
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:ai-affiliate-empire/*"
    }
  ]
}
```

## Updated Services

The following services have been updated to use SecretsManagerService:

1. **OpenAIService** - GPT text generation
2. **ClaudeService** - Claude text generation
3. **AmazonService** - Amazon product search
4. **ElevenLabsService** - Voice generation
5. **PikaLabsService** - Video generation
6. **YoutubeService** - YouTube Shorts publishing
7. **TiktokService** - TikTok video publishing
8. **InstagramService** - Instagram Reels publishing

All services implement `OnModuleInit` to load secrets during application bootstrap.

## Caching Strategy

- **Cache TTL**: 5 minutes (300,000 milliseconds)
- **Cache Location**: In-memory (per service instance)
- **Cache Invalidation**: Automatic after TTL expires
- **Manual Clear**: `secretsManager.clearCache(secretName)`

This balances between reducing AWS API calls and supporting secret rotation.

## Error Handling

### Graceful Degradation

1. **AWS Connection Failed**: Falls back to environment variables
2. **Secret Not Found**: Falls back to environment variables
3. **Transient Errors**: Retries with exponential backoff (3 attempts)
4. **Auth Errors**: No retry, immediate fallback

### Audit Logging

All secret access attempts are logged:

```typescript
{
  timestamp: '2025-10-31T12:00:00.000Z',
  level: 'SUCCESS' | 'ERROR',
  secretName: 'ai-affiliate-empire/openai-api-key',
  message: 'Secret accessed successfully'
  // Secret value is NEVER logged
}
```

## Secret Rotation

To rotate a secret:

1. Update secret in AWS Secrets Manager console
2. Wait for cache to expire (5 minutes) OR
3. Restart application for immediate effect OR
4. Call `secretsManager.clearCache()` to invalidate cache

## Best Practices

### Development
- Use `.env` file with `AWS_SECRETS_MANAGER_ENABLED=false`
- Keep `.env.example` updated with all required variables
- Never commit `.env` to version control

### Production
- Enable AWS Secrets Manager with `AWS_SECRETS_MANAGER_ENABLED=true`
- Use IAM roles for EC2/ECS/Lambda (not access keys)
- Enable AWS CloudTrail for audit logging
- Set up secret rotation schedules
- Remove secrets from `.env` after migration
- Use separate AWS accounts for dev/staging/prod

### Security
- Never log secret values
- Clear terminal history after running migration script
- Use least-privilege IAM policies
- Enable MFA for AWS accounts
- Regularly rotate secrets (90 days recommended)
- Monitor secret access via CloudTrail

## Troubleshooting

### Application won't start
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM permissions
- Check `.env` has fallback values
- Set `AWS_SECRETS_MANAGER_ENABLED=false` for local testing

### Secrets not updating
- Check cache TTL (5 minutes)
- Restart application to force refresh
- Clear cache: `secretsManager.clearCache()`

### AWS API errors
- Check AWS region configuration
- Verify secret name prefix matches
- Ensure secrets exist in AWS
- Check IAM policy permissions

## Cost Considerations

AWS Secrets Manager pricing (as of 2025):
- **Secret Storage**: $0.40 per secret per month
- **API Calls**: $0.05 per 10,000 API calls

With 20 secrets and caching:
- Storage: 20 × $0.40 = **$8/month**
- API Calls: ~1,000 calls/day = **$0.15/month**
- **Total: ~$8.15/month**

Caching significantly reduces API call costs.

## Future Enhancements

Potential improvements:
- Automatic secret rotation lambda functions
- Secret versioning support
- Cross-region replication
- Integration with AWS KMS for custom encryption keys
- Webhook notifications on secret changes
- Secret access analytics dashboard

## References

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
