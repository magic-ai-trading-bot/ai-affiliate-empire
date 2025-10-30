# Deployment Guide - AI Affiliate Empire

**Production deployment strategies, CI/CD pipelines, and best practices**

---

## Table of Contents

- [Overview](#overview)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment Platforms](#deployment-platforms)
- [Environment Configuration](#environment-configuration)
- [Deployment Process](#deployment-process)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)
- [Deployment Checklist](#deployment-checklist)

## Overview

The AI Affiliate Empire uses a production-grade CI/CD pipeline with the following characteristics:

- ✅ **Zero-downtime deployments** using blue-green deployment strategy
- ✅ **Automatic rollback** on health check failure
- ✅ **Multi-environment support**: staging and production
- ✅ **Security scanning** with Trivy, Snyk, and Grype
- ✅ **Smoke tests** to validate deployments
- ✅ **Database migration safety** with automatic backups
- ✅ **Multi-platform Docker builds** (amd64, arm64)

### Pipeline Architecture

```
Code Push → CI Pipeline → Build & Test → CD Pipeline → Deploy → Smoke Tests → Monitor
                ↓
            Security Scan
                ↓
           Docker Build
                ↓
            Push to Registry
```

## CI/CD Pipeline

### 1. Continuous Integration (`.github/workflows/ci.yml`)

**Triggered on:** Push to main/develop, Pull Requests

#### Jobs

**Lint**
- Runs ESLint on all TypeScript files
- Enforces code quality standards
- Fails on errors, warnings allowed

**Type Check**
- Runs TypeScript compiler in check mode
- Generates Prisma Client
- Validates type safety

**Test (Matrix: Node 18.x, 20.x)**
- Starts PostgreSQL service container
- Runs unit tests
- Runs integration tests
- Runs E2E tests
- Generates coverage report
- Uploads coverage to Codecov

**Security Audit**
- Runs `npm audit` for known vulnerabilities
- Scans for exposed secrets using TruffleHog
- Checks for high/critical security issues

**Build**
- Builds application
- Caches build artifacts
- Validates successful compilation

#### Success Criteria

- ✅ All linting passes
- ✅ All tests pass (85%+ coverage)
- ✅ No high/critical vulnerabilities
- ✅ Successful build

### 2. Continuous Deployment (`.github/workflows/cd.yml`)

**Triggered on:** Push to main (staging), Manual workflow dispatch (production)

#### Staging Deployment

Automatic deployment when code is pushed to `main`:

1. Checkout code
2. Install dependencies
3. Generate Prisma Client
4. Build application
5. Deploy to Fly.io (staging)
6. Run smoke tests
7. Health check verification
8. Notify on success/failure

**Environment:** `staging`
**URL:** `https://ai-affiliate-empire-staging.fly.dev`

#### Production Deployment

Manual deployment with approval gate:

1. Requires manual workflow dispatch
2. Needs staging deployment to pass
3. Database backup before deployment
4. Blue-green deployment strategy
5. Comprehensive health checks (15 attempts max)
6. Smoke test validation
7. 2-minute monitoring window
8. Automatic rollback on failure
9. Deployment event recording
10. Team notifications

**Environment:** `production`
**URL:** `https://ai-affiliate-empire.fly.dev`

#### Rollback Triggers

Automatic rollback is triggered when:
- Health checks fail (>15 attempts)
- Smoke tests fail
- Service becomes unhealthy during monitoring
- Database migrations fail

### 3. Docker Build & Publish (`.github/workflows/docker-build.yml`)

**Triggered on:** Push to main, version tags

#### Features

- **Multi-platform builds**: linux/amd64, linux/arm64
- **Image tagging**:
  - Semantic versioning (v1.2.3)
  - Major.minor (v1.2)
  - Major version (v1)
  - Branch name
  - Commit SHA
  - Latest (for default branch)
- **Security scanning**:
  - Trivy vulnerability scanner
  - Snyk container security
  - Grype scanner
- **SBOM generation** in SPDX format
- **Automated testing** of built images

#### Container Registry

Images are published to GitHub Container Registry:
```
ghcr.io/yourusername/ai-affiliate-empire:latest
ghcr.io/yourusername/ai-affiliate-empire:v1.0.0
ghcr.io/yourusername/ai-affiliate-empire:main-abc1234
```

## Deployment Platforms

### Option 1: Fly.io (Recommended)

**Why Fly.io:**
- Global edge deployment with low latency
- Automatic SSL/TLS certificates
- Built-in PostgreSQL with backups
- Blue-green deployments
- Cost-effective ($20-50/month)
- Excellent DX with Fly CLI

#### Initial Setup

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login to Fly.io
flyctl auth login

# 3. Create staging application
flyctl apps create ai-affiliate-empire-staging --region sjc

# 4. Create production application
flyctl apps create ai-affiliate-empire --region sjc

# 5. Create PostgreSQL databases
flyctl postgres create \
  --name ai-affiliate-empire-staging-db \
  --region sjc \
  --initial-cluster-size 1

flyctl postgres create \
  --name ai-affiliate-empire-db \
  --region sjc \
  --initial-cluster-size 2

# 6. Attach databases to applications
flyctl postgres attach \
  --app ai-affiliate-empire-staging \
  ai-affiliate-empire-staging-db

flyctl postgres attach \
  --app ai-affiliate-empire \
  ai-affiliate-empire-db

# 7. Configure secrets (see Environment Configuration section)
flyctl secrets set -a ai-affiliate-empire-staging \
  OPENAI_API_KEY=sk-... \
  ANTHROPIC_API_KEY=sk-... \
  # ... other secrets

# 8. Deploy
flyctl deploy --config deploy/fly.staging.toml
flyctl deploy --config deploy/fly.production.toml
```

#### Configuration Files

**Staging** (`deploy/fly.staging.toml`):
- 1 instance minimum
- 512MB RAM
- Rolling deployment strategy
- Health checks every 30 seconds

**Production** (`deploy/fly.production.toml`):
- 2 instances minimum (high availability)
- 1GB RAM per instance
- Blue-green deployment strategy
- Health checks every 15 seconds
- Auto-scaling: 2-10 instances

#### Key Features

- **Auto-scaling**: Based on CPU/memory utilization
- **Health monitoring**: Automated health checks
- **Metrics**: Built-in Prometheus metrics
- **Zero-downtime deployments**: Blue-green strategy
- **Automatic rollback**: On health check failure

### Option 2: Railway

**Why Railway:**
- Extremely simple deployment
- Built-in PostgreSQL and Redis
- Automatic environment variable management
- GitHub integration
- Cost-effective for small to medium scale

#### Setup

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Link to Railway project
railway link

# 5. Deploy
railway up
```

#### Configuration

File: `deploy/railway.json`

**Services:**
- **API**: Node.js application (1-5 replicas)
- **PostgreSQL**: Managed database (512MB RAM)
- **Redis**: Managed cache (256MB RAM)

**Auto-scaling:**
- Min replicas: 1
- Max replicas: 5
- Target CPU: 70%
- Target Memory: 80%

**Health Checks:**
- Path: `/health`
- Interval: 30 seconds
- Timeout: 10 seconds

### Option 3: Kubernetes

**Why Kubernetes:**
- Maximum control and flexibility
- Enterprise-grade orchestration
- Multi-cloud support
- Advanced scaling capabilities
- Production-grade reliability

#### Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- kubectl CLI installed
- Access to cluster configured
- Helm (optional but recommended)

#### Deployment Steps

```bash
# 1. Create namespace
kubectl apply -f deploy/kubernetes/namespace.yaml

# 2. Configure secrets (IMPORTANT: Update values!)
cp deploy/kubernetes/secret.yaml deploy/kubernetes/secret.local.yaml
# Edit secret.local.yaml with actual secret values
kubectl apply -f deploy/kubernetes/secret.local.yaml

# 3. Create ConfigMap
kubectl apply -f deploy/kubernetes/configmap.yaml

# 4. Deploy PostgreSQL (or use cloud-managed database)
kubectl apply -f deploy/kubernetes/postgres-statefulset.yaml

# 5. Deploy application
kubectl apply -f deploy/kubernetes/deployment.yaml

# 6. Create services
kubectl apply -f deploy/kubernetes/service.yaml

# 7. Configure ingress with TLS
kubectl apply -f deploy/kubernetes/ingress.yaml

# 8. Enable horizontal pod autoscaling
kubectl apply -f deploy/kubernetes/hpa.yaml

# 9. Verify deployment
kubectl get pods -n ai-affiliate-empire
kubectl get svc -n ai-affiliate-empire
kubectl get ingress -n ai-affiliate-empire
```

#### Kubernetes Resources

**Manifests:**
- `namespace.yaml`: Isolated environment
- `configmap.yaml`: Configuration data
- `secret.yaml`: Sensitive credentials
- `deployment.yaml`: Application deployment (3 replicas)
- `service.yaml`: LoadBalancer service
- `ingress.yaml`: TLS-enabled ingress with cert-manager
- `hpa.yaml`: Horizontal Pod Autoscaler (3-10 pods)
- `postgres-statefulset.yaml`: PostgreSQL StatefulSet

**Key Features:**
- **Zero-downtime deployments**: RollingUpdate with maxUnavailable=0
- **Health probes**: Liveness, readiness, and startup probes
- **Auto-scaling**: 3-10 replicas based on CPU/memory
- **Resource limits**: CPU and memory constraints
- **Security**: Non-root user, read-only filesystem
- **TLS/SSL**: Automatic with Let's Encrypt via cert-manager

## Environment Configuration

### Environment Files

1. **`.env.example`** - Template with all variables and descriptions
2. **`.env.staging`** - Staging environment configuration
3. **`.env.production.example`** - Production template (DO NOT commit actual .env.production)

### Required Environment Variables

#### Application Core

```bash
NODE_ENV=production              # Environment: development, staging, production
PORT=3000                       # Application port
LOG_LEVEL=info                  # Logging level: debug, info, warn, error
```

#### Database

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379     # Optional, for caching
```

#### AWS Secrets Manager (Recommended for Production)

```bash
AWS_SECRETS_MANAGER_ENABLED=true
AWS_REGION=us-east-1
SECRET_NAME_PREFIX=ai-affiliate-empire
# In production, use IAM roles instead of access keys
```

#### API Keys (Required)

```bash
# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Content Generation
ELEVENLABS_API_KEY=...
PIKA_LABS_API_KEY=...

# Social Platforms
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...

# Affiliate Networks
AMAZON_ASSOCIATES_ACCESS_KEY=...
AMAZON_ASSOCIATES_SECRET_KEY=...
SHAREASALE_API_TOKEN=...
CJ_AFFILIATE_API_KEY=...
```

#### Security (CRITICAL - Generate strong random values)

```bash
# Generate with: openssl rand -base64 32
JWT_SECRET=<strong-random-value-32-chars-min>
ENCRYPTION_KEY=<32-character-random-string>
COOKIE_SECRET=<strong-random-value>
```

#### Monitoring

```bash
# Sentry Error Tracking
SENTRY_DSN=https://...@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Secrets Management

#### Option 1: AWS Secrets Manager (Recommended for Production)

**Setup:**

```bash
# 1. Configure AWS credentials
aws configure

# 2. Migrate secrets from .env to AWS Secrets Manager
npm run migrate:secrets

# 3. Enable in environment
export AWS_SECRETS_MANAGER_ENABLED=true
export AWS_REGION=us-east-1
export SECRET_NAME_PREFIX=ai-affiliate-empire

# 4. Application automatically fetches secrets at startup
npm run start:prod
```

**IAM Permissions Required:**

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

**Benefits:**
- Centralized secret management
- Automatic secret rotation
- Audit logging for compliance
- No secrets in code or environment variables
- Automatic fallback to .env in development

#### Option 2: Fly.io Secrets

```bash
# Set secrets
flyctl secrets set -a ai-affiliate-empire \
  OPENAI_API_KEY=sk-... \
  ANTHROPIC_API_KEY=sk-...

# List secrets (values hidden)
flyctl secrets list -a ai-affiliate-empire

# Unset a secret
flyctl secrets unset SECRET_NAME -a ai-affiliate-empire

# Import from file
flyctl secrets import -a ai-affiliate-empire < .env.production
```

#### Option 3: Kubernetes Secrets

```bash
# Create from file
kubectl create secret generic ai-affiliate-empire-secrets \
  --from-env-file=.env.production \
  -n ai-affiliate-empire

# Or use Sealed Secrets (recommended)
# https://github.com/bitnami-labs/sealed-secrets

# View secrets (base64 encoded)
kubectl get secret ai-affiliate-empire-secrets -n ai-affiliate-empire -o yaml
```

## Deployment Process

### Staging Deployment

#### Automatic (via CI/CD)

1. Push code to `main` branch
2. CI pipeline runs automatically (lint, test, build)
3. If CI passes, CD pipeline deploys to staging
4. Database migrations run automatically
5. Health checks verify deployment
6. Smoke tests validate functionality
7. Notifications sent on success/failure

#### Manual Deployment

```bash
# Using deployment script
./scripts/deploy-staging.sh

# Or using Fly CLI directly
flyctl deploy --config deploy/fly.staging.toml --remote-only
```

**What the script does:**
1. Checks prerequisites (Docker, Fly CLI, API tokens)
2. Builds Docker image with proper tags
3. Pushes image to GitHub Container Registry
4. Deploys to Fly.io staging
5. Runs database migrations
6. Waits for deployment stabilization (15 seconds)
7. Performs health checks (10 attempts max)
8. Runs smoke tests
9. Sends notifications

### Production Deployment

#### Via GitHub Actions (Recommended)

1. Navigate to GitHub repository → Actions tab
2. Select "Continuous Deployment" workflow
3. Click "Run workflow" button
4. Select environment: "production"
5. Click "Run workflow" to confirm
6. Monitor deployment progress in Actions tab
7. Review smoke test results
8. Check notifications in Discord/Slack

#### Manual Script Deployment

```bash
# WARNING: This deploys to production
./scripts/deploy-production.sh
```

**Safety Checks:**
- Requires clean git status (no uncommitted changes)
- Must be on `main` branch
- Interactive confirmation prompt
- Database backup before deployment
- Automatic rollback on failure

#### Production Deployment Steps

**1. Pre-deployment Checks**
- Verify git status is clean
- Confirm on main branch
- Check prerequisites (Docker, Fly CLI, tokens)

**2. Build Phase**
- Build Docker image for linux/amd64
- Tag with version, commit SHA, and latest
- Generate build metadata

**3. Push Phase**
- Login to GitHub Container Registry
- Push all image tags
- Verify successful upload

**4. Backup Phase**
- Create PostgreSQL database backup
- Store current deployment ID for rollback
- Log backup creation

**5. Deploy Phase**
- Deploy using blue-green strategy
- Run database migrations
- Wait for deployment stabilization (20 seconds)

**6. Validation Phase**
- Comprehensive health checks (15 attempts, 10 seconds apart)
- Run production smoke tests
- Monitor for 2 minutes for anomalies

**7. Finalization**
- Record deployment event in deployments.log
- Send success notifications to Discord/Slack
- Display deployment information

**8. Automatic Rollback**
If any step fails, automatic rollback is triggered:
- Health check failure
- Smoke test failure
- Service degradation during monitoring

## Rollback Procedures

### Automatic Rollback

Automatically triggered when:
- Health checks fail after 15 attempts (150 seconds)
- Smoke tests fail
- Service becomes unhealthy during monitoring window
- Database migrations fail

The rollback process is fully automated and requires no manual intervention.

### Manual Rollback

If you need to manually rollback a deployment:

```bash
# Rollback production to previous version
./scripts/rollback.sh production

# Rollback staging
./scripts/rollback.sh staging
```

### Rollback Process

**1. Fetch Deployment History**
```bash
flyctl releases list --app ai-affiliate-empire
```

**2. Identify Previous Stable Release**
- Gets the last known good deployment
- Confirms rollback target version

**3. Create Backup**
- Database snapshot of current state
- Store rollback metadata

**4. Execute Rollback**
```bash
flyctl releases rollback --app ai-affiliate-empire --version <previous-version>
```

**5. Wait for Completion**
- 15 seconds stabilization period
- Monitor deployment status

**6. Verify Health**
- Run health checks (10 attempts max)
- Validate health endpoint responses
- Check database migration status

**7. Validate Functionality**
- Run basic smoke tests
- Verify critical endpoints
- Check service responses

**8. Alert & Record**
- Send rollback notifications
- Log rollback event with timestamp
- Update deployment history

### Database Rollback

If database migrations were applied during failed deployment:

```bash
# 1. Restore database from backup
flyctl postgres backup restore \
  --app ai-affiliate-empire-db \
  --backup <backup-id>

# 2. Rollback application
./scripts/rollback.sh production

# 3. Verify migration status
flyctl ssh console --app ai-affiliate-empire \
  --command "npx prisma migrate status"

# 4. If needed, resolve migration state
flyctl ssh console --app ai-affiliate-empire \
  --command "npx prisma migrate resolve --rolled-back <migration-name>"
```

## Monitoring and Alerts

### Health Endpoints

| Endpoint | Purpose | Response Time | Interval |
|----------|---------|---------------|----------|
| `/health` | Basic health check | <3s | 30s |
| `/health/ready` | Database connectivity | <5s | 15s |
| `/health/live` | Service liveness | <2s | 10s |
| `/health/services` | External APIs status | <10s | 60s |
| `/metrics` | Prometheus metrics | <5s | On-demand |

### Key Metrics

#### Application Metrics

- **Request Rate**: requests/second
- **Response Time**: p50, p95, p99 percentiles
- **Error Rate**: percentage of failed requests
- **Active Connections**: current concurrent connections
- **Queue Depth**: pending background jobs

#### Infrastructure Metrics

- **CPU Utilization**: percentage (target <70%)
- **Memory Usage**: MB (monitor for leaks)
- **Disk I/O**: IOPS and throughput
- **Network**: inbound/outbound traffic

#### Business Metrics

- **Content Generation Rate**: videos/posts per day
- **Publishing Success Rate**: percentage
- **Affiliate Conversion Rate**: clicks to conversions
- **Revenue**: per day/week/month

### Sentry Integration

Error tracking and performance monitoring:

```bash
export SENTRY_DSN=https://your-key@sentry.io/project-id
export SENTRY_ENVIRONMENT=production
export SENTRY_TRACES_SAMPLE_RATE=0.1
export SENTRY_PROFILES_SAMPLE_RATE=0.1
```

**Features:**
- Automatic error capture with stack traces
- Performance transaction tracking
- Release tracking and deployment monitoring
- User session replay
- Custom event tagging

### Notifications

#### Discord Webhooks

```bash
export DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**Alerts sent for:**
- ✅ Deployment success
- ❌ Deployment failure
- 🔄 Rollback initiated
- 🚨 Critical errors
- ⚠️ Service degradation
- 📊 Daily metrics summary

#### Slack Webhooks

```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Same alerts as Discord, formatted for Slack.

## Troubleshooting

### Common Issues

#### 1. Health Check Failures

**Symptoms:**
- Deployment fails during health check verification
- Service marked as unhealthy
- Automatic rollback triggered

**Diagnosis:**

```bash
# Check application logs
flyctl logs --app ai-affiliate-empire

# Test health endpoint directly
curl -v https://ai-affiliate-empire.fly.dev/health

# SSH into container to debug
flyctl ssh console --app ai-affiliate-empire

# Check database connectivity
npx prisma migrate status

# View recent deployment events
flyctl status --app ai-affiliate-empire
```

**Common Causes:**
- Database connection issues
- Missing environment variables
- Prisma client not generated
- Port binding errors

**Solutions:**
```bash
# Regenerate Prisma Client
npx prisma generate

# Verify environment variables
flyctl secrets list --app ai-affiliate-empire

# Check port configuration
echo $PORT  # Should be 3000

# Restart app
flyctl apps restart ai-affiliate-empire
```

#### 2. Database Migration Errors

**Symptoms:**
- Migration fails during deployment
- Application can't connect to database
- Schema mismatch errors

**Diagnosis:**

```bash
# Check migration status
flyctl ssh console --app ai-affiliate-empire \
  --command "npx prisma migrate status"

# View migration history
flyctl postgres connect --app ai-affiliate-empire-db
\dt _prisma_migrations;
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;
```

**Solutions:**

```bash
# Manually run migrations
flyctl ssh console --app ai-affiliate-empire \
  --command "npx prisma migrate deploy"

# Mark migration as rolled back (if stuck)
flyctl ssh console --app ai-affiliate-empire \
  --command "npx prisma migrate resolve --rolled-back <migration-name>"

# Reset database (CAUTION: Data loss!)
flyctl ssh console --app ai-affiliate-empire \
  --command "npx prisma migrate reset --force"

# Restore from backup
flyctl postgres backup restore \
  --app ai-affiliate-empire-db \
  --backup <backup-id>
```

#### 3. Container Build Failures

**Symptoms:**
- Docker build fails in CI/CD
- Image won't start
- Missing dependencies

**Diagnosis:**

```bash
# Build locally to debug
docker build -t test-build .

# Check build logs
docker build --progress=plain -t test-build . 2>&1 | tee build.log

# Inspect failed layer
docker history test-build

# Run container locally
docker run -it --entrypoint /bin/sh test-build
```

**Common Causes:**
- Missing dependencies in package.json
- Prisma generation failure
- Build step errors
- Multi-stage build issues

**Solutions:**

```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Generate Prisma Client
npm run prisma:generate

# Build locally
npm run build

# Test Dockerfile stages individually
docker build --target deps -t test-deps .
docker build --target builder -t test-builder .
docker build --target runner -t test-runner .
```

#### 4. External API Failures

**Symptoms:**
- Service degradation
- Timeout errors
- Circuit breaker open

**Diagnosis:**

```bash
# Check service status
curl https://ai-affiliate-empire.fly.dev/health/services

# View detailed logs
flyctl logs --app ai-affiliate-empire | grep "API"

# Monitor circuit breaker states
curl https://ai-affiliate-empire.fly.dev/metrics | grep circuit
```

**Solutions:**

```bash
# Verify API credentials
flyctl secrets list --app ai-affiliate-empire

# Check rate limits
# Review API provider dashboard

# Temporarily disable failing service
flyctl secrets set ENABLE_MOCK_MODE=true

# Update API credentials if expired
flyctl secrets set OPENAI_API_KEY=new-key
```

#### 5. Performance Issues

**Symptoms:**
- Slow response times
- High CPU/memory usage
- Database query timeouts

**Diagnosis:**

```bash
# Check resource usage
flyctl status --app ai-affiliate-empire

# View metrics
flyctl metrics --app ai-affiliate-empire

# Analyze slow queries
flyctl postgres connect --app ai-affiliate-empire-db
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

# Check connection pool
SELECT count(*) FROM pg_stat_activity;
```

**Solutions:**

```bash
# Scale up resources
flyctl scale vm shared-cpu-2x --app ai-affiliate-empire

# Add more instances
flyctl scale count 3 --app ai-affiliate-empire

# Optimize database
VACUUM ANALYZE;
REINDEX DATABASE affiliate_empire;

# Add caching layer
# Enable Redis and configure caching
```

### Debug Tools

#### View Logs

```bash
# Tail logs in real-time
flyctl logs -a ai-affiliate-empire -f

# Filter logs by level
flyctl logs -a ai-affiliate-empire | grep ERROR

# Export logs
flyctl logs -a ai-affiliate-empire > logs.txt

# Kubernetes
kubectl logs -f deployment/ai-affiliate-empire-api -n ai-affiliate-empire
kubectl logs --previous deployment/ai-affiliate-empire-api -n ai-affiliate-empire
```

#### Access Container

```bash
# Fly.io
flyctl ssh console --app ai-affiliate-empire

# Run commands
flyctl ssh console -a ai-affiliate-empire -C "ls -la"
flyctl ssh console -a ai-affiliate-empire -C "cat /app/package.json"

# Kubernetes
kubectl exec -it deployment/ai-affiliate-empire-api -n ai-affiliate-empire -- /bin/sh
kubectl exec -it deployment/ai-affiliate-empire-api -n ai-affiliate-empire -- npm run prisma:studio
```

#### Database Access

```bash
# Fly.io Postgres
flyctl postgres connect --app ai-affiliate-empire-db

# Run queries
SELECT version();
\dt
\d+ products

# Kubernetes
kubectl port-forward svc/postgres-service 5432:5432 -n ai-affiliate-empire
psql postgresql://user:password@localhost:5432/affiliate_empire
```

#### Monitor Deployment

```bash
# Watch deployment status
watch flyctl status --app ai-affiliate-empire

# Monitor resource usage
flyctl metrics --app ai-affiliate-empire

# Check scaling events
flyctl scale show --app ai-affiliate-empire

# Kubernetes
kubectl get pods -n ai-affiliate-empire -w
kubectl top pods -n ai-affiliate-empire
kubectl describe hpa ai-affiliate-empire-hpa -n ai-affiliate-empire
```

## Security Best Practices

### 1. Secrets Management

✅ **DO:**
- Use AWS Secrets Manager, HashiCorp Vault, or equivalent
- Rotate secrets regularly (every 90 days minimum)
- Use different secrets for each environment
- Enable secret access audit logging
- Use IAM roles instead of access keys when possible
- Encrypt secrets at rest and in transit

❌ **DON'T:**
- Commit secrets to git repositories
- Share secrets in plain text (Slack, email)
- Use default or weak secrets
- Reuse secrets across environments
- Hard-code secrets in application code
- Log secrets or expose them in error messages

### 2. Network Security

- **TLS/SSL**: Enable for all connections (database, APIs, web traffic)
- **Private Networks**: Use for database and internal services
- **Firewall Rules**: Restrict ingress to necessary ports only
- **Rate Limiting**: Implement on all public endpoints
- **CORS**: Configure allowlist, don't use wildcard (*)
- **DDoS Protection**: Use Cloudflare or equivalent

### 3. Container Security

- **Non-root User**: Run containers as unprivileged user (UID 1001)
- **Minimal Images**: Use Alpine Linux for smaller attack surface
- **Vulnerability Scanning**: Trivy, Snyk, Grype in CI/CD
- **Dependency Updates**: Regular security patches
- **Read-only Filesystem**: When possible
- **Security Headers**: X-Frame-Options, CSP, HSTS

### 4. Database Security

- **Strong Passwords**: 32+ characters, random
- **SSL Connections**: Enforce for all database connections
- **Regular Backups**: Automated daily backups, test restore
- **Row-level Security**: Implement in Postgres
- **Audit Logging**: Track all database access
- **Least Privilege**: Grant minimal required permissions

### 5. Access Control

- **IAM Roles**: Use instead of static credentials
- **Least Privilege**: Grant minimum required permissions
- **MFA**: Enable for all production access
- **Access Audits**: Regular review of who has access
- **Credential Rotation**: Automated rotation every 90 days
- **Session Timeout**: Limit session duration

### 6. Monitoring & Alerting

- **Audit Logging**: All security events logged
- **Security Alerts**: Real-time notifications
- **Anomaly Detection**: Monitor for unusual patterns
- **Regular Scans**: Weekly vulnerability scans
- **Failed Auth**: Track and alert on failures
- **SIEM Integration**: Security information and event management

### 7. Compliance

- **GDPR**: User data protection
- **SOC 2**: Security controls
- **HIPAA**: If handling health data
- **PCI DSS**: If handling payment data
- **Data Encryption**: At rest and in transit
- **Audit Trail**: Complete activity history

## Deployment Checklist

### Pre-Deployment

- [ ] **Code Quality**
  - [ ] All tests passing (unit, integration, E2E)
  - [ ] Linting passed
  - [ ] Type checking passed
  - [ ] Code reviewed and approved

- [ ] **Security**
  - [ ] Security audit clean (no high/critical vulnerabilities)
  - [ ] Secrets not committed to git
  - [ ] Dependencies updated
  - [ ] Container images scanned

- [ ] **Configuration**
  - [ ] Environment variables configured
  - [ ] Secrets properly managed (AWS/Fly/K8s)
  - [ ] Database connection verified
  - [ ] External API credentials valid

- [ ] **Infrastructure**
  - [ ] Database backups enabled
  - [ ] Monitoring configured (Sentry)
  - [ ] Alerts configured (Discord/Slack)
  - [ ] Health checks implemented

- [ ] **Documentation**
  - [ ] README updated
  - [ ] Changelog updated
  - [ ] API docs updated
  - [ ] Version bumped (semver)

- [ ] **Testing**
  - [ ] Smoke tests written
  - [ ] Load testing completed
  - [ ] Rollback procedure tested

- [ ] **Communication**
  - [ ] Team notified of deployment
  - [ ] Stakeholders informed
  - [ ] Maintenance window scheduled (if needed)

### During Deployment

- [ ] **Monitor**
  - [ ] Watch deployment logs
  - [ ] Monitor health checks
  - [ ] Track error rates
  - [ ] Observe resource usage

- [ ] **Validate**
  - [ ] Smoke tests passing
  - [ ] Health endpoints responding
  - [ ] Database migrations successful
  - [ ] External APIs accessible

### Post-Deployment

- [ ] **Verification**
  - [ ] Application accessible
  - [ ] Critical features working
  - [ ] No error spikes
  - [ ] Performance acceptable

- [ ] **Monitoring** (15-30 minutes)
  - [ ] Error rate < 5%
  - [ ] Response time p95 < 3 seconds
  - [ ] CPU usage < 70%
  - [ ] Memory stable (no leaks)

- [ ] **Documentation**
  - [ ] Deployment logged
  - [ ] Release notes published
  - [ ] Team notified of completion

- [ ] **Rollback Plan**
  - [ ] Previous version identified
  - [ ] Rollback tested
  - [ ] Backup verified

## Post-Deployment Verification

### 1. Health Checks

```bash
# Basic health
curl https://ai-affiliate-empire.fly.dev/health

# Readiness (database)
curl https://ai-affiliate-empire.fly.dev/health/ready

# Liveness
curl https://ai-affiliate-empire.fly.dev/health/live

# Services
curl https://ai-affiliate-empire.fly.dev/health/services
```

### 2. Smoke Tests

```bash
# Run all smoke tests
npm run test:smoke:production

# Or individually
npm run test:smoke -- health.smoke.spec.ts
npm run test:smoke -- api.smoke.spec.ts
npm run test:smoke -- database.smoke.spec.ts
npm run test:smoke -- external-apis.smoke.spec.ts
```

### 3. Monitor Logs

```bash
# Tail logs
flyctl logs -a ai-affiliate-empire -f

# Look for errors
flyctl logs -a ai-affiliate-empire | grep -i error

# Check startup
flyctl logs -a ai-affiliate-empire | grep "Application started"
```

### 4. Check Metrics

```bash
# Prometheus metrics
curl https://ai-affiliate-empire.fly.dev/metrics

# Sentry dashboard
# Visit sentry.io to check error rates

# Fly.io dashboard
flyctl status -a ai-affiliate-empire
flyctl metrics -a ai-affiliate-empire
```

### 5. Functional Validation

- **Content Generation**: Create a test content piece
- **Publishing**: Verify posting to platforms works
- **Analytics**: Check tracking is recording events
- **Dashboard**: Access admin dashboard
- **API**: Test critical endpoints

### Rollback Decision Criteria

Monitor for 15-30 minutes. **Rollback if:**

- ❌ Error rate > 5%
- ❌ Response time p95 > 3 seconds
- ❌ CPU usage consistently > 80%
- ❌ Memory leak detected
- ❌ Critical functionality broken
- ❌ Database connection issues
- ❌ External API failures
- ❌ User complaints increase

## Support & Resources

### Documentation

- [README.md](../README.md) - Project overview and quick start
- [QUICKSTART.md](../QUICKSTART.md) - Detailed setup guide
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [API Documentation](http://localhost:3000/api) - Swagger UI

### Tools

- **Fly.io Dashboard**: https://fly.io/dashboard
- **Sentry**: https://sentry.io
- **GitHub Actions**: Repository → Actions tab
- **Container Registry**: ghcr.io/yourusername/ai-affiliate-empire

### Contact

- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Community support and discussions
- **Email**: support@ai-affiliate-empire.com

---

**Last Updated:** 2024-10-31
**Version:** 1.0.0
**Maintained By:** DevOps Team
