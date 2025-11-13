# API Credential Security Guide - AI Affiliate Empire

**Best practices for securing, managing, and rotating API credentials**

Last Updated: 2025-11-01 | Status: Active | Version: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Security Principles](#security-principles)
3. [Credential Storage](#credential-storage)
4. [AWS Secrets Manager Setup](#aws-secrets-manager-setup)
5. [Credential Rotation](#credential-rotation)
6. [Access Control](#access-control)
7. [Monitoring & Auditing](#monitoring--auditing)
8. [Emergency Procedures](#emergency-procedures)
9. [Compliance & Standards](#compliance--standards)
10. [Incident Response](#incident-response)

---

## Overview

This guide covers securing API credentials across all 8 production APIs:

| API | Sensitivity | Rotation | Storage |
|-----|------------|----------|---------|
| OpenAI | High | 90 days | AWS Secrets Manager |
| ElevenLabs | Medium | 90 days | AWS Secrets Manager |
| Pika Labs | Medium | 90 days | AWS Secrets Manager |
| YouTube | High (OAuth) | 90 days | Database |
| TikTok | High | 90 days | AWS Secrets Manager |
| Instagram | High (OAuth) | 60 days | Database |
| Cloudflare R2 | High | 90 days | AWS Secrets Manager |

**Critical Rule**: Never commit credentials to git. Never hardcode secrets.

---

## Security Principles

### Core Tenets

1. **Principle of Least Privilege**
   - Each service gets only required permissions
   - Create separate API keys for dev/staging/production
   - Use scoped tokens with minimal scopes

2. **Defense in Depth**
   - Multiple layers of security
   - Encryption at rest and in transit
   - Network isolation where possible
   - Monitoring and alerting

3. **Zero Trust**
   - Assume all credentials may be compromised
   - Verify all access attempts
   - Log all credential usage
   - Implement circuit breakers

4. **Least Exposure**
   - Secrets never logged or printed
   - Credentials rotated regularly
   - Immediate revocation on compromise
   - Secure destruction of old credentials

### Threat Model

```
Potential Threats:
1. Accidental exposure in logs
2. Git repository leaks
3. Environment variable exposure
4. Deployment config leaks
5. Insider threats
6. Compromised CI/CD pipelines
7. Unencrypted backups
8. Default credentials not changed
```

**Mitigations**:
- Use AWS Secrets Manager (not environment variables)
- Implement secret scanning in CI/CD
- Encrypt all backups
- Audit all access
- Rotate regularly
- Use strong, unique credentials

---

## Credential Storage

### Development Environment

**Best Practice**: Use mock mode during development

```bash
# .env (development only, NOT committed)
OPENAI_MOCK_MODE=true
ELEVENLABS_MOCK_MODE=true
PIKALABS_MOCK_MODE=true

# Only add real credentials if testing specific API
OPENAI_API_KEY=sk-proj-xxx (if needed for testing)

# Protect .env file
chmod 600 .env
echo ".env" >> .gitignore
```

**For Team Development**:

1. **Shared Credentials** (for testing)
   - Use team's staging account
   - Create separate API keys
   - Store in 1Password or LastPass
   - Never commit to repository
   - Rotate monthly

2. **Individual Keys** (preferred)
   - Each developer gets personal key
   - Limited to non-production APIs
   - Revoke when developer leaves
   - Easy to audit who accessed what

### Staging Environment

**Setup**:

```bash
# Use staging API keys with spending limits
# Store in .env.staging (encrypted)

# Encrypt with git-crypt (optional)
git-crypt lock .env.staging

# Or use environment-specific secrets
export ENVIRONMENT=staging
npm run secrets:load  # Loads from AWS Secrets Manager
```

**Access**:
- Deployed via CI/CD
- Secrets loaded from AWS Secrets Manager
- No .env files in repository

### Production Environment

**Requirements**:

1. **No .env files**
   - Secrets Manager only
   - Environment variables from IAM roles
   - Never commit production secrets

2. **Encryption**
   - All at-rest storage encrypted
   - TLS 1.2+ for all communications
   - Certificate pinning optional (high security)

3. **Access Control**
   - IAM roles, not static credentials
   - Time-limited temporary credentials
   - MFA for manual access
   - Service-to-service authentication

---

## AWS Secrets Manager Setup

### Prerequisites

```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter:
# - AWS Access Key ID: your-access-key
# - AWS Secret Access Key: your-secret-key
# - Default region: us-east-1
# - Default output: json
```

### Initial Setup

#### Step 1: Create Secrets Structure

```bash
# Create main secret containing all API keys
aws secretsmanager create-secret \
  --name ai-affiliate-empire/production/api-keys \
  --description "Production API credentials for AI Affiliate Empire" \
  --secret-string '{
    "openai_api_key": "sk-proj-...",
    "elevenlabs_api_key": "...",
    "pikalabs_api_key": "...",
    "youtube_client_id": "...",
    "youtube_client_secret": "...",
    "tiktok_client_key": "...",
    "tiktok_client_secret": "...",
    "instagram_access_token": "...",
    "r2_access_key_id": "...",
    "r2_secret_access_key": "..."
  }' \
  --region us-east-1

# Verify creation
aws secretsmanager describe-secret \
  --secret-id ai-affiliate-empire/production/api-keys \
  --region us-east-1
```

#### Step 2: Setup IAM Role for Application

```bash
# Create IAM policy for Secrets Manager access
cat > /tmp/secrets-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT-ID:secret:ai-affiliate-empire/*"
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name ai-affiliate-empire-secrets-reader \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach policy to role
aws iam put-role-policy \
  --role-name ai-affiliate-empire-secrets-reader \
  --policy-name read-secrets \
  --policy-document file:///tmp/secrets-policy.json
```

#### Step 3: Update Application Configuration

```bash
# .env (production)
AWS_SECRETS_MANAGER_ENABLED=true
AWS_REGION=us-east-1
SECRET_NAME_PREFIX=ai-affiliate-empire/production

# Application will load secrets from AWS Secrets Manager on startup
# Falls back to environment variables if AWS unavailable
```

#### Step 4: Deploy

```bash
# For ECS/Fargate
# Attach role to task definition

# For Fly.io
fly secrets set \
  AWS_SECRETS_MANAGER_ENABLED=true \
  AWS_REGION=us-east-1 \
  SECRET_NAME_PREFIX=ai-affiliate-empire/production

# Restart application
npm run start:prod
```

### Secrets Manager Operations

#### Retrieve Secret (programmatic)

```javascript
// In Node.js application
const SecretsManager = require('aws-sdk').SecretsManager;
const client = new SecretsManager({region: 'us-east-1'});

const getSecret = async (secretName) => {
  try {
    const response = await client.getSecretValue({SecretId: secretName}).promise();
    return JSON.parse(response.SecretString);
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
};

// Usage
const secrets = await getSecret('ai-affiliate-empire/production/api-keys');
process.env.OPENAI_API_KEY = secrets.openai_api_key;
```

#### Rotate Secret (manual)

```bash
# 1. Generate new credentials in provider
# 2. Update secret
aws secretsmanager update-secret \
  --secret-id ai-affiliate-empire/production/api-keys \
  --secret-string '{
    "openai_api_key": "sk-proj-NEW-KEY",
    ...
  }' \
  --region us-east-1

# 3. Verify update
aws secretsmanager get-secret-value \
  --secret-id ai-affiliate-empire/production/api-keys \
  --region us-east-1 | jq '.SecretString | fromjson | .openai_api_key'

# 4. Restart application to load new secrets
npm run restart:prod

# 5. Verify functionality
npm run test:api-connectivity

# 6. Revoke old key in provider
# (done manually in provider dashboard)
```

#### View Secret Version History

```bash
# List versions
aws secretsmanager list-secret-version-ids \
  --secret-id ai-affiliate-empire/production/api-keys \
  --region us-east-1

# Get specific version
aws secretsmanager get-secret-value \
  --secret-id ai-affiliate-empire/production/api-keys \
  --version-id abc123 \
  --region us-east-1
```

#### Enable Automatic Rotation (Optional)

```bash
# AWS can automatically rotate credentials
# Configure rotation lambda (advanced)

aws secretsmanager rotate-secret \
  --secret-id ai-affiliate-empire/production/api-keys \
  --rotation-rules AutomaticallyAfterDays=30 \
  --region us-east-1
```

---

## Credential Rotation

### Rotation Schedule

| API | Frequency | Timing | Risk if Delayed |
|-----|-----------|--------|-----------------|
| OpenAI | 90 days | Quarterly | High - high spend risk |
| ElevenLabs | 90 days | Quarterly | Medium - reputational |
| Pika Labs | 90 days | Quarterly | Medium - service interrupt |
| YouTube | 90 days | Quarterly | Medium - OAuth flow |
| TikTok | 90 days | Quarterly | High - approval needed |
| Instagram | 60 days | Bi-monthly | High - token auto-refresh |
| Cloudflare R2 | 90 days | Quarterly | High - storage access |

### Rotation Procedure

#### Phase 1: Planning

```bash
# 1 week before rotation date
[ ] Review current credentials
[ ] Check for any known issues
[ ] Schedule maintenance window
[ ] Notify team of planned rotation
[ ] Test rotation on staging first

# Calendar reminder: Set 90-day recurring reminder
date -v +90d  # macOS
date -d "+90 days"  # Linux
```

#### Phase 2: Pre-Rotation

```bash
# 1 day before rotation
[ ] Create backup of current secrets
[ ] Document current API usage patterns
[ ] Setup monitoring for rotation period
[ ] Notify stakeholders

# Backup command
aws secretsmanager get-secret-value \
  --secret-id ai-affiliate-empire/production/api-keys \
  --region us-east-1 > /secure/backup/secrets-backup-$(date +%Y%m%d).json

# Encrypt backup
gpg --symmetric /secure/backup/secrets-backup-*.json
rm /secure/backup/secrets-backup-*.json  # Remove plaintext
```

#### Phase 3: Rotation

For each API:

```bash
# OpenAI Example

# 1. Generate new key in provider
#    https://platform.openai.com/account/api-keys
#    Save as: sk-proj-new-key-here

# 2. Test new key (staging first)
export OPENAI_API_KEY=sk-proj-new-key-here
npm run test:api -- --api=openai

# 3. Update AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id ai-affiliate-empire/production/api-keys \
  --secret-string file:///tmp/new-secrets.json \
  --region us-east-1

# 4. Deploy to production
npm run deploy:prod

# 5. Monitor for errors
npm run logs:prod | grep -i "openai\|error\|401\|403"

# 6. Verify API connectivity
npm run test:api-connectivity

# 7. Keep old key active for 7 days (grace period)
# Do NOT revoke yet - in case rollback needed

# 8. After 7 days, revoke old key in provider
#    https://platform.openai.com/account/api-keys
#    Delete old key
```

#### Phase 4: Post-Rotation

```bash
# 1 day after rotation
[ ] Verify no errors in logs
[ ] Check API usage metrics
[ ] Confirm all integrations working
[ ] Document rotation completion

# Monitoring checklist
npm run test:api-connectivity
npm run health:check
# Expected: All APIs responding

# Cost check
# Review each provider dashboard
# Expected: Normal usage patterns, no errors
```

### Automated Rotation Script

```bash
#!/bin/bash
# scripts/rotate-credentials.sh

set -euo pipefail

ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}

log_info() { echo "[INFO] $1"; }
log_error() { echo "[ERROR] $1" >&2; exit 1; }

# 1. Backup current secrets
log_info "Backing up current credentials..."
aws secretsmanager get-secret-value \
  --secret-id ai-affiliate-empire/$ENVIRONMENT/api-keys \
  --region us-east-1 \
  --query SecretString \
  --output text > /tmp/backup-$(date +%Y%m%d).json

# 2. Verify backup readable
if ! grep -q "openai_api_key" /tmp/backup-*.json; then
  log_error "Backup verification failed"
fi

# 3. Prompt for new credentials
read -p "Enter new OpenAI API key: " openai_key
read -p "Enter new ElevenLabs API key: " elevenlabs_key
# ... etc

# 4. Create new secrets object
NEW_SECRETS=$(cat <<EOF
{
  "openai_api_key": "$openai_key",
  "elevenlabs_api_key": "$elevenlabs_key"
}
EOF
)

# 5. In dry-run mode, just show what would be done
if [[ "$DRY_RUN" == "true" ]]; then
  log_info "DRY RUN - Would update:"
  echo "$NEW_SECRETS" | jq '.'
  exit 0
fi

# 6. Update secrets
log_info "Updating secrets in AWS..."
aws secretsmanager update-secret \
  --secret-id ai-affiliate-empire/$ENVIRONMENT/api-keys \
  --secret-string "$NEW_SECRETS" \
  --region us-east-1

# 7. Restart application
log_info "Restarting application..."
npm run restart:$ENVIRONMENT

# 8. Wait for restart
sleep 30

# 9. Test connectivity
log_info "Testing API connectivity..."
npm run test:api-connectivity

log_info "Rotation complete!"
```

---

## Access Control

### IAM Policies

#### Read-Only Access (Developers)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:DescribeSecret",
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ai-affiliate-empire/staging/*",
      "Condition": {
        "StringEquals": {
          "secretsmanager:VersionStage": "AWSCURRENT"
        }
      }
    }
  ]
}
```

#### Admin Access (DevOps Team)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:*"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ai-affiliate-empire/*"
    }
  ]
}
```

#### Application Service Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ai-affiliate-empire/production/*"
    }
  ]
}
```

### API Key Scoping

#### OpenAI

```bash
# Create separate keys for different purposes
Key 1: api-scripts-generation (production)
Key 2: api-scripts-testing (staging)
Key 3: api-scripts-development (personal)

# Set spending limit per key in dashboard
Production key: $100/month max
Staging key: $20/month max
Dev key: $5/month max
```

#### YouTube OAuth Scopes

```json
{
  "scopes": [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly"
  ],
  "restricted_to": "YouTube Shorts publishing only"
}
```

#### Instagram Permissions

```json
{
  "permissions": [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "pages_read_engagement"
  ],
  "accounts": ["instagram-business-account-id-only"]
}
```

---

## Monitoring & Auditing

### CloudWatch Logging

```bash
# Enable CloudWatch for Secrets Manager access
aws secretsmanager describe-secret \
  --secret-id ai-affiliate-empire/production/api-keys \
  --region us-east-1 | jq '.LastAccessedDate'

# View access logs
aws logs describe-log-groups --query 'logGroups[?contains(logGroupName, `secrets`)].logGroupName'

# Setup CloudWatch alarm for suspicious access
aws cloudwatch put-metric-alarm \
  --alarm-name secrets-access-anomaly \
  --alarm-description "Alert on unusual Secrets Manager access" \
  --metric-name SecretAccessCount \
  --namespace AWS/SecretsManager \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:alerts
```

### Application-Level Logging

```javascript
// Log all API credential usage (without exposing credentials)
logger.info('API Request', {
  api: 'openai',
  endpoint: '/v1/messages',
  status: 200,
  duration_ms: 245,
  tokens_used: 1523,
  timestamp: new Date().toISOString(),
  // DO NOT log: api_key, request_body, response_body
});
```

### Audit Trail

```bash
# View all secret updates
aws secretsmanager describe-secret \
  --secret-id ai-affiliate-empire/production/api-keys \
  --region us-east-1 | jq '.VersionIdsToStages'

# Show who changed secrets (requires CloudTrail)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=ai-affiliate-empire/production/api-keys \
  --max-results 50
```

### Monitoring Dashboard

Create CloudWatch dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name "API-Credentials-Security" \
  --dashboard-body file:///tmp/dashboard.json
```

Monitor:
- Secrets Manager API calls (GetSecretValue, UpdateSecret)
- Failed authentication attempts
- Unusual access patterns
- API usage metrics (spending, quota usage)
- Error rates across all integrations

---

## Emergency Procedures

### Credential Compromise

If a credential is exposed (leaked in logs, committed to git, etc.):

```bash
# IMMEDIATE (within 5 minutes)
[ ] Identify which credential was exposed
[ ] Notify security team
[ ] Do NOT log it anywhere else
[ ] Prepare to revoke immediately

# WITHIN 15 MINUTES
[ ] Revoke the exposed credential in provider
    Example (OpenAI): https://platform.openai.com/account/api-keys
    → Delete the exposed key
    → Confirm deletion

[ ] Generate replacement credential
    → Create new API key in provider
    → Test on staging first

[ ] Update AWS Secrets Manager
    aws secretsmanager update-secret \
      --secret-id ai-affiliate-empire/production/api-keys \
      --secret-string file:///tmp/new-secrets.json

[ ] Deploy to all environments
    npm run deploy:production
    npm run deploy:staging

# WITHIN 1 HOUR
[ ] Search git history for exposure
    git log -p -S 'sk-proj-' | head -100
    # If found: git filter-branch (see git section)

[ ] Review CloudTrail logs
    # Check if compromised key was used

[ ] Monitor API usage for suspicious activity
    # Unusual request volume
    # Requests from unexpected IPs
    # Calls to unexpected endpoints

# WITHIN 24 HOURS
[ ] Incident report
    - What was exposed
    - When it was exposed
    - How it was discovered
    - Actions taken
    - Lessons learned

[ ] Review all similar credentials
    - Rotate other keys proactively
    - Check security practices

[ ] Improve processes
    - Add secret scanning to CI/CD
    - Improve logging practices
    - Enhance access controls
```

### Service Down Due to Expired Credentials

If service stops due to expired or invalid credentials:

```bash
# 1. Identify issue
npm run logs:prod | grep -i "401\|403\|unauthorized\|invalid"
# Look for: "Invalid API key", "Authentication failed"

# 2. Get old credentials from backup
# (if available - should be encrypted and offsite)

# 3. Quick rollback (temporary)
[ ] Deploy previous working version temporarily
    git revert HEAD
    npm run deploy:prod

[ ] This buys time to fix credentials

# 4. Fix credentials
[ ] Generate new key in provider
[ ] Update secrets
[ ] Redeploy current version

# 5. Monitor for stability
npm run test:api-connectivity
npm run health:check

# 6. Post-incident review
[ ] Why weren't credentials rotated?
[ ] Why wasn't expiry noticed?
[ ] Add automatic expiry notifications
```

### Mass Credential Revocation

In case of security breach affecting multiple APIs:

```bash
# 1. Revoke compromised credentials
# (done in each provider dashboard)

# 2. Generate all new credentials for all APIs
# (coordinated across team)

# 3. Update Secrets Manager with all new keys
aws secretsmanager update-secret \
  --secret-id ai-affiliate-empire/production/api-keys \
  --secret-string file:///tmp/all-new-credentials.json

# 4. Test each API
npm run test:api openai
npm run test:api elevenlabs
# ... etc

# 5. Deploy to all environments
npm run deploy:production
npm run deploy:staging

# 6. Monitor closely for 48 hours
npm run logs:prod | grep -i error
npm run metrics:current
```

---

## Compliance & Standards

### Standards Compliance

#### SOC 2
- Secrets Manager access logging
- Regular rotation (90 days)
- Access controls via IAM
- Encryption at rest
- Monitoring and alerting

#### GDPR
- No personal data in credentials
- Deletion on request (revoke + delete)
- Audit trail for 3 years
- DPA with AWS for Secrets Manager

#### PCI DSS (if processing cards)
- Separate credentials per environment
- Change credentials every 90 days
- Limit credential sharing
- Track credential use
- Protect against unauthorized access

### Documentation

Maintain records:

```bash
# 1. Credential inventory
cat > /secure/docs/credential-inventory.md << 'EOF'
# API Credential Inventory

| API | Environment | Key ID | Rotation Date | Status | Notes |
|-----|-------------|--------|---------------|--------|-------|
| OpenAI | production | sk-proj-abc123 | 2025-08-01 | active | $100/month limit |
| ...

EOF

# 2. Access log
# Automated via CloudTrail - stored in S3 with versioning

# 3. Rotation history
cat > /secure/docs/rotation-history.md << 'EOF'
# Credential Rotation History

| Date | API | Reason | Result | Tested By | Approved By |
|------|-----|--------|--------|-----------|-------------|
| 2025-08-01 | OpenAI | Quarterly | Success | dev-team | security-lead |
| ...

EOF

# 4. Incident log
cat > /secure/docs/security-incidents.md << 'EOF'
# Security Incidents

| Date | Type | Credential | Response Time | Resolution | Root Cause |
|------|------|-----------|----------------|-----------|-----------|
| 2025-06-15 | Leaked | OpenAI-staging | 8 minutes | Revoked | Git commit |
| ...

EOF
```

---

## Incident Response

### Response Plan

```
INCIDENT SEVERITY LEVELS:

CRITICAL (respond in minutes)
- Production credential fully compromised
- Active unauthorized API usage detected
- Multiple credentials simultaneously exposed
- Action: Immediate revocation, full rotation

HIGH (respond in hours)
- Staging credential leaked
- Expired credential causing service outage
- Potential unauthorized access detected
- Action: Revoke, rotate, investigate

MEDIUM (respond in 24 hours)
- Development credential exposed
- Rate limit exceeded due to leak
- Rotation not completed on schedule
- Action: Rotate, monitor, review

LOW (respond in 1 week)
- Minor policy violation
- Non-critical API key rotation due
- Documentation updates needed
- Action: Schedule maintenance
```

### Communication

```
On incident discovery:
1. Alert security team (Slack channel: #security-incidents)
2. Notify engineering lead
3. Post status update to stakeholders

Hourly updates while active:
- What happened
- What we're doing
- ETA to resolution
- Service impact

Post-incident (24 hours):
- Full incident report
- Root cause analysis
- Preventive measures
- Timeline of events
```

---

## Quick Reference

### Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Security Lead | security@company.com | 24/7 |
| DevOps Lead | devops@company.com | Business hours |
| CTO | cto@company.com | On-call rotation |

### Critical Checklists

**Weekly**:
- [ ] Review CloudTrail logs
- [ ] Check API usage metrics
- [ ] Verify no unauthorized activity

**Monthly**:
- [ ] Credential audit
- [ ] Access control review
- [ ] Rotation schedule check

**Quarterly**:
- [ ] Full security review
- [ ] Penetration testing (external)
- [ ] Disaster recovery test

**Annually**:
- [ ] Compliance audit
- [ ] Security policy update
- [ ] Training refresh

---

**Last Updated**: 2025-11-01
**Maintained By**: Security Team
**Review Schedule**: Quarterly
**Version**: 1.0
