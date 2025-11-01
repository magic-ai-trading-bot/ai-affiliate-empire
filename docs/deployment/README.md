# Deployment Documentation

Complete deployment documentation for AI Affiliate Empire production CI/CD pipeline.

## Overview

This directory contains comprehensive guides for deploying and managing the AI Affiliate Empire application in production environments using GitHub Actions and Fly.io.

## Quick Start

Follow these guides in order for first-time deployment:

1. **[GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)** - Configure required GitHub repository secrets
2. **[Branch Protection Rules](./BRANCH_PROTECTION_RULES.md)** - Setup branch protection for code quality
3. **[CI/CD Testing Guide](./CI_CD_TESTING.md)** - Test workflows locally before deployment
4. **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification checklist
5. **[First Deployment Guide](./FIRST_DEPLOYMENT.md)** - Step-by-step first deployment walkthrough

## Documentation Index

### Setup & Configuration

#### [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)
Complete guide for configuring GitHub repository secrets required for CI/CD deployment.

**Contents**:
- Required vs optional secrets
- How to obtain each secret
- Automated setup script usage
- Security best practices
- Troubleshooting common issues

**Time**: 15-20 minutes

**Prerequisites**:
- GitHub CLI installed
- Repository admin access
- Fly.io account created

---

#### [Branch Protection Rules](./BRANCH_PROTECTION_RULES.md)
Guide for configuring GitHub branch protection rules to ensure code quality and deployment safety.

**Contents**:
- Main branch protection settings
- Required status checks configuration
- CODEOWNERS file setup
- Automated setup script
- Emergency bypass procedures

**Time**: 10-15 minutes

**Prerequisites**:
- GitHub CLI installed
- Repository admin access

---

### Testing & Validation

#### [CI/CD Testing Guide](./CI_CD_TESTING.md)
Guide for testing GitHub Actions workflows locally and validating CI/CD pipeline before pushing changes.

**Contents**:
- Local testing with Act
- Workflow syntax validation
- Database testing setup
- Performance optimization
- Debugging failed workflows

**Time**: 30-45 minutes (initial setup)

**Prerequisites**:
- Docker installed
- Act CLI installed
- Actionlint installed

---

#### [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
Comprehensive pre-deployment verification checklist to ensure successful production deployment.

**Contents**:
- Code quality verification
- GitHub configuration checks
- Infrastructure setup validation
- Database preparation
- Environment variables verification
- Rollback procedures

**Time**: 20-30 minutes per deployment

**Use**: Before every production deployment

---

### Deployment Guides

#### [First Deployment Guide](./FIRST_DEPLOYMENT.md)
Step-by-step guide for deploying AI Affiliate Empire to staging and production for the first time.

**Contents**:
- Initial setup (GitHub, Fly.io)
- Staging deployment walkthrough
- Production deployment walkthrough
- Post-deployment monitoring
- Troubleshooting common issues
- Rollback procedures

**Time**: 60-90 minutes (first time)

**Prerequisites**:
- All setup guides completed
- Secrets configured
- Branch protection enabled

---

## Deployment Workflow

### Standard Deployment Flow

```
┌─────────────────┐
│  Code Changes   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create PR      │ ◄─── Branch protection enforces:
│  on Main        │      - Required reviews
└────────┬────────┘      - Status checks pass
         │               - Linear history
         ▼
┌─────────────────┐
│  CI Checks Run  │ ◄─── Automated checks:
│  Automatically  │      - Lint
└────────┬────────┘      - Type check
         │               - Tests
         │               - Security audit
         │               - Build
         ▼
┌─────────────────┐
│  PR Approved &  │
│  Merged to Main │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto Deploy    │ ◄─── Automatic deployment:
│  to Staging     │      - Build Docker image
└────────┬────────┘      - Push to GHCR
         │               - Deploy to Fly.io
         │               - Run smoke tests
         ▼
┌─────────────────┐
│  Staging        │
│  Verification   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Manual Trigger │ ◄─── Manual approval required:
│  Production     │      - Review staging results
│  Deployment     │      - Approve deployment
└────────┬────────┘      - Monitor production
         │
         ▼
┌─────────────────┐
│  Production     │ ◄─── Verification:
│  Monitoring     │      - Health checks
└─────────────────┘      - Error monitoring
                         - Performance tracking
```

### Hotfix Deployment Flow

```
┌─────────────────┐
│  Critical Issue │
│  in Production  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Hotfix  │
│  Branch         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Make Fix &     │
│  Test Locally   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create PR      │ ◄─── Expedited review:
│  (High Priority)│      - Fast-track approval
└────────┬────────┘      - All checks must pass
         │
         ▼
┌─────────────────┐
│  Merge & Deploy │ ◄─── Same CI/CD pipeline
│  to Staging     │      but monitored closely
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Quick Verify   │
│  on Staging     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Production     │ ◄─── Immediate deployment
│  Deployment     │      - Rollback ready
└────────┬────────┘      - Team on standby
         │
         ▼
┌─────────────────┐
│  Monitor        │ ◄─── Close monitoring:
│  Production     │      - 2-hour watch
└─────────────────┘      - Error tracking
```

## Scripts Reference

### Setup Scripts

#### `scripts/setup-github-secrets.sh`
Interactive script to configure GitHub repository secrets.

```bash
# Run full setup
./scripts/setup-github-secrets.sh

# Set specific secret
./scripts/setup-github-secrets.sh --secret FLY_API_TOKEN

# List configured secrets
./scripts/setup-github-secrets.sh --list
```

#### `scripts/setup-branch-protection.sh`
Automated script to configure GitHub branch protection rules.

```bash
# Apply branch protection
./scripts/setup-branch-protection.sh

# Verify settings (requires jq)
gh api /repos/:owner/:repo/branches/main/protection | jq
```

### Deployment Scripts

#### `scripts/deploy-staging.sh`
Manual deployment to staging environment.

```bash
# Deploy to staging
./scripts/deploy-staging.sh

# Deploy with specific version
./scripts/deploy-staging.sh --version v1.2.3
```

#### `scripts/deploy-production.sh`
Manual deployment to production environment.

```bash
# Deploy to production (with confirmations)
./scripts/deploy-production.sh

# Deploy specific version
./scripts/deploy-production.sh --version v1.2.3
```

#### `scripts/rollback.sh`
Rollback to previous deployment.

```bash
# Rollback staging
./scripts/rollback.sh staging

# Rollback production
./scripts/rollback.sh production

# Rollback to specific release
./scripts/rollback.sh production --release v1.2.2
```

## CI/CD Workflows

### Continuous Integration (`.github/workflows/ci.yml`)

Runs on every push and pull request to main/develop branches.

**Jobs**:
- `lint` - ESLint code quality check
- `type-check` - TypeScript compilation check
- `test` - Unit, integration, and E2E tests (Node 18.x and 20.x)
- `security-audit` - npm audit and secret scanning
- `build` - Production build verification
- `all-checks-passed` - Meta job ensuring all checks passed

**Status**: All jobs must pass before PR can be merged.

### Continuous Deployment (`.github/workflows/cd.yml`)

Deploys to staging on every push to main, production on manual trigger.

**Jobs**:
- `deploy-staging` - Automatic deployment to staging
- `deploy-production` - Manual deployment to production (requires approval)
- `post-deployment-monitoring` - Post-deployment health monitoring

**Environments**:
- Staging: `https://ai-affiliate-empire-staging.fly.dev`
- Production: `https://ai-affiliate-empire.fly.dev`

### Docker Build (`.github/workflows/docker-build.yml`)

Builds and publishes Docker images on push to main and version tags.

**Jobs**:
- `build-and-push` - Build multi-platform Docker image
- `scan-image` - Security vulnerability scanning
- `test-image` - Test Docker image functionality

**Registry**: GitHub Container Registry (ghcr.io)

## Environment Configuration

### Staging Environment

**Purpose**: Pre-production testing and validation

**Configuration**:
- Mock external services enabled
- Reduced resource allocation
- Separate database from production
- Auto-stop machines when idle

**Access**:
- URL: `https://ai-affiliate-empire-staging.fly.dev`
- Logs: `flyctl logs --app ai-affiliate-empire-staging`
- SSH: `flyctl ssh console --app ai-affiliate-empire-staging`

### Production Environment

**Purpose**: Live application serving customers

**Configuration**:
- Real API credentials
- AWS Secrets Manager integration
- Blue-green deployment strategy
- High availability (min 2 machines)
- Auto-scaling enabled

**Access**:
- URL: `https://ai-affiliate-empire.fly.dev`
- Logs: `flyctl logs --app ai-affiliate-empire`
- SSH: `flyctl ssh console --app ai-affiliate-empire` (use with caution)

## Monitoring & Observability

### Application Monitoring

**Health Checks**:
```bash
# Staging
curl https://ai-affiliate-empire-staging.fly.dev/health

# Production
curl https://ai-affiliate-empire.fly.dev/health
```

**Logs**:
```bash
# Stream logs (staging)
flyctl logs --app ai-affiliate-empire-staging --follow

# Stream logs (production)
flyctl logs --app ai-affiliate-empire --follow

# Search logs
flyctl logs --app ai-affiliate-empire | grep "error"
```

**Metrics**:
```bash
# View metrics
flyctl metrics --app ai-affiliate-empire

# Application status
flyctl status --app ai-affiliate-empire
```

### Error Tracking

**Sentry Integration**:
- Dashboard: `https://sentry.io/organizations/magic-ai-trading-bot/projects/ai-affiliate-empire/`
- Automatic error capture
- Release tracking
- Performance monitoring

**Alert Channels**:
- Slack notifications (if configured)
- Discord notifications (if configured)
- Email alerts (Sentry)

## Troubleshooting

### Common Deployment Issues

| Issue | Quick Fix | Documentation |
|-------|-----------|---------------|
| Secrets not found | `./scripts/setup-github-secrets.sh` | [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md#troubleshooting) |
| CI checks failing | `act -j lint` (test locally) | [CI/CD Testing](./CI_CD_TESTING.md#common-issues-and-solutions) |
| Health check fails | Check logs: `flyctl logs` | [First Deployment](./FIRST_DEPLOYMENT.md#troubleshooting-common-issues) |
| Database migration fails | `flyctl ssh console` → check status | [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md#issue-database-migration-fails) |
| Out of memory | Increase `memory_mb` in fly.toml | [First Deployment](./FIRST_DEPLOYMENT.md#issue-application-out-of-memory) |

### Emergency Contacts

**For Production Issues**:
1. Check [Troubleshooting Guide](./FIRST_DEPLOYMENT.md#troubleshooting-common-issues)
2. Review application logs
3. Execute rollback if necessary: `./scripts/rollback.sh production`
4. Escalate to team lead if unresolved

## Best Practices

### Pre-Deployment
- ✅ Always deploy to staging first
- ✅ Run full test suite locally
- ✅ Review deployment checklist
- ✅ Notify team of upcoming deployment
- ✅ Ensure rollback plan is ready

### During Deployment
- ✅ Monitor logs continuously
- ✅ Watch error rates in Sentry
- ✅ Verify health checks pass
- ✅ Run smoke tests after deployment
- ✅ Be ready to rollback

### Post-Deployment
- ✅ Monitor for 24 hours
- ✅ Track key metrics
- ✅ Document any issues
- ✅ Update runbooks if needed
- ✅ Communicate success to team

## Security Considerations

### Secrets Management
- Never commit secrets to repository
- Use GitHub Secrets for CI/CD credentials
- Use Fly.io secrets for runtime configuration
- Use AWS Secrets Manager for production (recommended)
- Rotate secrets every 90 days

### Access Control
- Require reviews on all PRs
- Enforce branch protection on main
- Limit direct push access
- Use manual approval for production deployments
- Audit access logs regularly

### Vulnerability Scanning
- Automatic npm audit on every CI run
- Docker image scanning with Trivy
- Container scanning with Snyk (optional)
- Secret scanning with TruffleHog
- Regular dependency updates

## Additional Resources

### External Documentation
- [Fly.io Docs](https://fly.io/docs/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Sentry Documentation](https://docs.sentry.io/)

### Project Documentation
- [Main README](../../README.md)
- [Deployment Guide](../deployment-guide.md)
- [System Architecture](../system-architecture.md)
- [Production Best Practices](../production-best-practices.md)

### Community & Support
- GitHub Issues: Create issue for deployment problems
- Fly.io Community: https://community.fly.io
- Project Wiki: Internal documentation and runbooks

---

## Quick Reference Commands

### GitHub CLI
```bash
# List secrets
gh secret list

# View workflow runs
gh run list

# Watch current run
gh run watch

# Trigger deployment
gh workflow run cd.yml -f environment=production
```

### Fly.io CLI
```bash
# List apps
flyctl apps list

# View logs
flyctl logs --app ai-affiliate-empire

# Check status
flyctl status --app ai-affiliate-empire

# List secrets
flyctl secrets list --app ai-affiliate-empire

# SSH into container
flyctl ssh console --app ai-affiliate-empire
```

### Local Testing
```bash
# Test linting
npm run lint

# Test type checking
npx tsc --noEmit

# Run tests
npm run test:all

# Build application
npm run build

# Test workflows locally
act -j build
```

---

**Last Updated**: 2025-10-31

**Version**: 1.0.0

**Maintained By**: DevOps Team
