# GitHub Secrets Setup Guide

Complete guide for configuring GitHub repository secrets required for CI/CD deployment.

## Overview

GitHub Actions workflows require secure access to external services. This guide covers all required and optional secrets for the AI Affiliate Empire deployment pipeline.

## Required Secrets

### 1. FLY_API_TOKEN (Required)
**Purpose**: Deploy application to Fly.io hosting platform

**How to obtain**:
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
flyctl auth login

# Get your API token
flyctl auth token
```

**How to set**:
```bash
# Via GitHub CLI
gh secret set FLY_API_TOKEN

# Or manually in GitHub UI:
# Settings → Secrets and variables → Actions → New repository secret
```

**Validation**:
```bash
# Test token validity
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.fly.io/graphql \
  -d '{"query":"{ personalOrganizations { nodes { name } } }"}' | jq
```

### 2. GITHUB_TOKEN (Auto-provided)
**Purpose**: GitHub Actions authentication, Docker registry access

**Notes**:
- Automatically provided by GitHub Actions
- No manual setup required
- Used for GitHub Container Registry (ghcr.io)
- Has limited permissions by default

**Permissions required** (set in workflow file):
```yaml
permissions:
  contents: read        # Read repository content
  packages: write       # Push Docker images
  id-token: write      # OIDC token generation
```

## Optional but Recommended Secrets

### 3. CODECOV_TOKEN (Recommended)
**Purpose**: Upload test coverage reports to Codecov

**How to obtain**:
1. Visit https://codecov.io
2. Sign in with GitHub
3. Select your repository
4. Copy the upload token from Settings → General

**How to set**:
```bash
gh secret set CODECOV_TOKEN
```

**Impact if missing**: Coverage reports won't be uploaded, but CI will continue

### 4. SNYK_TOKEN (Optional)
**Purpose**: Container security scanning with Snyk

**How to obtain**:
1. Visit https://snyk.io
2. Sign up/login
3. Go to Account Settings → API Token
4. Generate or copy existing token

**How to set**:
```bash
gh secret set SNYK_TOKEN
```

**Impact if missing**: Snyk security scan is skipped (set to `continue-on-error: true`)

### 5. SLACK_WEBHOOK_URL (Optional)
**Purpose**: Deployment notifications to Slack

**How to obtain**:
1. Go to Slack workspace → Settings → Incoming Webhooks
2. Click "Add New Webhook to Workspace"
3. Select channel for notifications
4. Copy webhook URL

**How to set**:
```bash
gh secret set SLACK_WEBHOOK_URL
```

**Impact if missing**: Slack notifications are skipped

### 6. DISCORD_WEBHOOK_URL (Optional)
**Purpose**: Deployment notifications to Discord

**How to obtain**:
1. Open Discord server settings
2. Go to Integrations → Webhooks
3. Create webhook or copy existing URL
4. Choose channel for notifications

**How to set**:
```bash
gh secret set DISCORD_WEBHOOK_URL
```

**Impact if missing**: Discord notifications are skipped

### 7. SENTRY_AUTH_TOKEN (Optional)
**Purpose**: Create Sentry releases and track deployments

**How to obtain**:
1. Visit https://sentry.io
2. Go to Settings → Account → API → Auth Tokens
3. Create new token with scopes:
   - `project:releases`
   - `org:read`

**How to set**:
```bash
gh secret set SENTRY_AUTH_TOKEN
```

**Impact if missing**: Sentry release tracking is skipped

## Production Secrets (Application Runtime)

These secrets are needed by the application at runtime and should be set in Fly.io:

### Database & Infrastructure
```bash
# Set in Fly.io for production
flyctl secrets set DATABASE_URL="postgresql://..." --app ai-affiliate-empire
flyctl secrets set NODE_ENV="production" --app ai-affiliate-empire
flyctl secrets set PORT="3000" --app ai-affiliate-empire
```

### AI Service API Keys
```bash
flyctl secrets set OPENAI_API_KEY="sk-..." --app ai-affiliate-empire
flyctl secrets set ELEVENLABS_API_KEY="..." --app ai-affiliate-empire
```

### Platform Credentials
```bash
flyctl secrets set YOUTUBE_CLIENT_ID="..." --app ai-affiliate-empire
flyctl secrets set YOUTUBE_CLIENT_SECRET="..." --app ai-affiliate-empire
flyctl secrets set TIKTOK_CLIENT_KEY="..." --app ai-affiliate-empire
flyctl secrets set INSTAGRAM_CLIENT_ID="..." --app ai-affiliate-empire
```

### AWS Secrets Manager (Production)
```bash
flyctl secrets set AWS_REGION="us-east-1" --app ai-affiliate-empire
flyctl secrets set AWS_ACCESS_KEY_ID="..." --app ai-affiliate-empire
flyctl secrets set AWS_SECRET_ACCESS_KEY="..." --app ai-affiliate-empire
flyctl secrets set AWS_SECRETS_MANAGER_ENABLED="true" --app ai-affiliate-empire
flyctl secrets set SECRET_NAME_PREFIX="ai-affiliate-empire" --app ai-affiliate-empire
```

## Quick Setup Script

Use the automated setup script for interactive configuration:

```bash
# Run interactive setup
./scripts/setup-github-secrets.sh

# Or set specific secrets
./scripts/setup-github-secrets.sh --secret FLY_API_TOKEN
```

## Verification Checklist

After setting secrets, verify configuration:

### GitHub Secrets
```bash
# List all configured secrets (values are hidden)
gh secret list

# Expected output should include:
# FLY_API_TOKEN          Updated YYYY-MM-DD
# CODECOV_TOKEN          Updated YYYY-MM-DD
# SLACK_WEBHOOK_URL      Updated YYYY-MM-DD
```

### Fly.io Secrets
```bash
# List production secrets
flyctl secrets list --app ai-affiliate-empire

# List staging secrets
flyctl secrets list --app ai-affiliate-empire-staging
```

## Security Best Practices

### Token Rotation
- Rotate tokens every 90 days
- Use token expiration when available
- Audit token usage regularly

### Access Control
- Use minimum required permissions
- Create service-specific tokens
- Never share tokens in plain text
- Use GitHub environments for production secrets

### Monitoring
- Enable Snyk for vulnerability scanning
- Review security advisories regularly
- Monitor secret access logs
- Set up alerts for failed authentications

## Troubleshooting

### Issue: "FLY_API_TOKEN is invalid"
**Solution**:
```bash
# Re-authenticate with Fly.io
flyctl auth login

# Generate new token
flyctl auth token

# Update GitHub secret
gh secret set FLY_API_TOKEN
```

### Issue: "Permission denied to push to ghcr.io"
**Solution**:
- Verify workflow has `packages: write` permission
- Check GitHub token hasn't expired
- Ensure repository visibility settings allow package access

### Issue: "Codecov upload failed"
**Solution**:
```bash
# Verify token is correct
# Get fresh token from https://codecov.io
gh secret set CODECOV_TOKEN

# Check repository is added to Codecov
```

### Issue: "Database connection failed"
**Solution**:
```bash
# Verify DATABASE_URL is set correctly in Fly.io
flyctl secrets list --app ai-affiliate-empire

# Test database connectivity
flyctl ssh console --app ai-affiliate-empire
# Inside container:
psql $DATABASE_URL
```

## Environment-Specific Secrets

### Staging Environment
```bash
# Set staging-specific secrets
flyctl secrets set DATABASE_URL="..." --app ai-affiliate-empire-staging
flyctl secrets set NODE_ENV="staging" --app ai-affiliate-empire-staging
flyctl secrets set SENTRY_ENVIRONMENT="staging" --app ai-affiliate-empire-staging
```

### Production Environment
```bash
# Set production-specific secrets
flyctl secrets set DATABASE_URL="..." --app ai-affiliate-empire
flyctl secrets set NODE_ENV="production" --app ai-affiliate-empire
flyctl secrets set SENTRY_ENVIRONMENT="production" --app ai-affiliate-empire
```

## GitHub Environments Setup

Configure GitHub environments for additional security:

```bash
# Via GitHub UI:
# Settings → Environments → New environment

# For Production:
# - Name: production
# - Require reviewers: Yes (1-2 reviewers)
# - Deployment branches: main only
# - Environment secrets: Production-specific values

# For Staging:
# - Name: staging
# - Require reviewers: No
# - Deployment branches: main, develop
# - Environment secrets: Staging-specific values
```

## Secrets Management Tools

### GitHub CLI
```bash
# Set secret interactively
gh secret set SECRET_NAME

# Set from file
gh secret set SECRET_NAME < secret.txt

# Set from environment variable
echo $SECRET_VALUE | gh secret set SECRET_NAME

# Delete secret
gh secret delete SECRET_NAME
```

### Fly.io CLI
```bash
# Set secret interactively
flyctl secrets set SECRET_NAME --app APP_NAME

# Set multiple secrets
flyctl secrets import --app APP_NAME < .env.production

# Unset secret
flyctl secrets unset SECRET_NAME --app APP_NAME
```

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Secret not found" | Secret not set in GitHub | Run `gh secret set SECRET_NAME` |
| "Invalid token" | Token expired or incorrect | Regenerate and update token |
| "Permission denied" | Insufficient permissions | Check token scopes and permissions |
| "Rate limit exceeded" | Too many API calls | Wait or use different token |
| "Connection timeout" | Network or firewall issue | Check network connectivity |

## Next Steps

After configuring all secrets:
1. ✅ Review [CI/CD Testing Guide](./CI_CD_TESTING.md)
2. ✅ Complete [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
3. ✅ Follow [First Deployment Guide](./FIRST_DEPLOYMENT.md)
4. ✅ Configure [Branch Protection Rules](./BRANCH_PROTECTION_RULES.md)

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Fly.io Secrets Management](https://fly.io/docs/reference/secrets/)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
