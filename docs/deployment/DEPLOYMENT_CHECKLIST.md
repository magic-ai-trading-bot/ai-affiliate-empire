# Deployment Checklist

Comprehensive pre-deployment verification checklist to ensure successful production deployment.

## Overview

This checklist must be completed before deploying to staging or production. Each item includes verification steps and rollback procedures.

## Pre-Deployment Checklist

### Phase 1: Code Quality (Required)

- [ ] **All Tests Passing**
  ```bash
  npm run test:all
  # Expected: All tests pass with >45% coverage
  ```
  - Unit tests: All passing
  - Integration tests: All passing
  - E2E tests: All passing
  - Coverage: ≥45% (target: 85%)

- [ ] **Linting Clean**
  ```bash
  npm run lint
  # Expected: No errors, warnings acceptable
  ```

- [ ] **Type Checking Clean**
  ```bash
  npx tsc --noEmit
  # Expected: No type errors
  ```

- [ ] **Build Successful**
  ```bash
  npm run build
  # Expected: Successful build with no errors
  ```

- [ ] **Security Audit Passed**
  ```bash
  npm audit --production --audit-level=moderate
  # Expected: No moderate or high vulnerabilities
  ```

### Phase 2: GitHub Configuration (Required)

- [ ] **GitHub Secrets Configured**
  ```bash
  gh secret list
  ```
  Required secrets:
  - [ ] `FLY_API_TOKEN` - Set and valid
  - [ ] `GITHUB_TOKEN` - Auto-provided by GitHub

  Optional but recommended:
  - [ ] `CODECOV_TOKEN` - For coverage reporting
  - [ ] `SNYK_TOKEN` - For security scanning
  - [ ] `SLACK_WEBHOOK_URL` or `DISCORD_WEBHOOK_URL` - For notifications
  - [ ] `SENTRY_AUTH_TOKEN` - For error tracking

  Verification:
  ```bash
  # Test Fly.io token
  flyctl auth whoami

  # List configured secrets (values hidden)
  gh secret list
  ```

- [ ] **GitHub Actions Workflows Valid**
  ```bash
  actionlint .github/workflows/*.yml
  # Expected: No errors
  ```

- [ ] **Repository Settings Configured**
  - Repository visibility: Private (recommended) or Public
  - Branch protection enabled on main branch
  - Required reviewers configured (recommended for production)
  - Require status checks before merging enabled

### Phase 3: Infrastructure Setup (Required)

- [ ] **Fly.io Apps Created**
  ```bash
  # Staging
  flyctl apps list | grep ai-affiliate-empire-staging

  # Production
  flyctl apps list | grep ai-affiliate-empire
  ```

- [ ] **Fly.io Databases Provisioned**
  ```bash
  # Staging database
  flyctl postgres list | grep staging

  # Production database
  flyctl postgres list | grep production
  ```

- [ ] **Fly.io Secrets Configured**
  ```bash
  # Check staging secrets
  flyctl secrets list --app ai-affiliate-empire-staging

  # Check production secrets
  flyctl secrets list --app ai-affiliate-empire
  ```

  Required secrets in Fly.io:
  - [ ] `DATABASE_URL` - PostgreSQL connection string
  - [ ] `NODE_ENV` - Set to "staging" or "production"
  - [ ] `OPENAI_API_KEY` - OpenAI API key
  - [ ] `ANTHROPIC_API_KEY` - Claude API key
  - [ ] Platform credentials (YouTube, TikTok, Instagram)
  - [ ] AWS Secrets Manager credentials (production only)

- [ ] **DNS Configuration (Production Only)**
  - Custom domain configured (if applicable)
  - SSL certificates provisioned
  - DNS records pointing to Fly.io

### Phase 4: Database Preparation (Required)

- [ ] **Database Backup Created**
  ```bash
  # Production only - create backup before deployment
  flyctl postgres backup create --app ai-affiliate-empire-db

  # Verify backup exists
  flyctl postgres backup list --app ai-affiliate-empire-db
  ```

- [ ] **Migrations Tested**
  ```bash
  # Test migrations on staging first
  flyctl ssh console --app ai-affiliate-empire-staging -C "npm run prisma:migrate:prod"

  # Verify schema
  flyctl ssh console --app ai-affiliate-empire-staging -C "npx prisma studio"
  ```

- [ ] **Migration Rollback Plan Ready**
  ```bash
  # Document current migration state
  flyctl ssh console --app ai-affiliate-empire -C "npx prisma migrate status" > migration-state-$(date +%Y%m%d).txt
  ```

- [ ] **Seed Data Prepared (if needed)**
  ```bash
  # Run seed script on staging
  flyctl ssh console --app ai-affiliate-empire-staging -C "npm run prisma:seed"
  ```

### Phase 5: Environment Variables (Required)

- [ ] **Environment Variables Validated**

  Staging (.env.staging):
  ```bash
  # Required variables
  NODE_ENV=staging
  DATABASE_URL=postgresql://...
  PORT=3000

  # API Keys
  OPENAI_API_KEY=sk-...
  ANTHROPIC_API_KEY=sk-ant-...

  # Platform Credentials
  YOUTUBE_CLIENT_ID=...
  YOUTUBE_CLIENT_SECRET=...

  # Monitoring
  SENTRY_DSN=https://...
  SENTRY_ENVIRONMENT=staging
  ```

  Production (.env.production):
  ```bash
  # Required variables
  NODE_ENV=production
  DATABASE_URL=postgresql://...
  PORT=3000

  # AWS Secrets Manager
  AWS_SECRETS_MANAGER_ENABLED=true
  AWS_REGION=us-east-1
  SECRET_NAME_PREFIX=ai-affiliate-empire

  # Monitoring
  SENTRY_DSN=https://...
  SENTRY_ENVIRONMENT=production
  ```

- [ ] **No Sensitive Data in Repository**
  ```bash
  # Check for exposed secrets
  git grep -i "api_key\|secret\|password" src/

  # Run TruffleHog scan
  docker run --rm trufflesecurity/trufflehog:latest github --repo=https://github.com/yourusername/ai-affiliate-empire
  ```

### Phase 6: Monitoring & Observability (Recommended)

- [ ] **Sentry Configured**
  - Project created in Sentry
  - DSN configured in environment variables
  - Source maps uploaded for better error tracking
  - Release tracking enabled

- [ ] **Log Aggregation Ready**
  ```bash
  # Test logging
  flyctl logs --app ai-affiliate-empire-staging

  # Verify log retention settings
  flyctl vm status --app ai-affiliate-empire-staging
  ```

- [ ] **Health Checks Configured**
  ```bash
  # Verify health endpoint
  curl https://ai-affiliate-empire-staging.fly.dev/health

  # Expected response:
  # {"status":"ok","timestamp":"...","uptime":...}
  ```

- [ ] **Alerts Configured**
  - Sentry alerts for errors
  - Fly.io alerts for downtime
  - Slack/Discord notifications configured

### Phase 7: Performance & Scalability (Recommended)

- [ ] **Resource Limits Configured**
  ```toml
  # In deploy/fly.staging.toml or deploy/fly.production.toml
  [vm]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512  # Staging
  # memory_mb = 1024  # Production
  ```

- [ ] **Auto-scaling Configured (Production)**
  ```toml
  [scaling]
  min_machines = 2  # High availability
  max_machines = 5  # Scale based on load
  ```

- [ ] **Rate Limiting Tested**
  ```bash
  # Test rate limiting
  for i in {1..100}; do curl https://ai-affiliate-empire-staging.fly.dev/api/products; done

  # Expected: 429 Too Many Requests after threshold
  ```

### Phase 8: Disaster Recovery (Required for Production)

- [ ] **Rollback Script Tested**
  ```bash
  # Test rollback on staging
  ./scripts/rollback.sh staging

  # Verify rollback works
  flyctl releases --app ai-affiliate-empire-staging
  ```

- [ ] **Backup Verification**
  ```bash
  # Verify backups are being created
  flyctl postgres backup list --app ai-affiliate-empire-db

  # Test restore process on staging
  flyctl postgres backup restore <backup-id> --app ai-affiliate-empire-staging-db
  ```

- [ ] **Incident Response Plan Documented**
  - Contact list for emergencies
  - Escalation procedures
  - Communication channels (Slack, email)
  - Runbooks for common issues

### Phase 9: Documentation (Required)

- [ ] **Deployment Documentation Updated**
  - [ ] README.md reflects current state
  - [ ] CHANGELOG.md updated with new changes
  - [ ] API documentation updated (Swagger/OpenAPI)
  - [ ] Architecture diagrams current

- [ ] **Runbooks Created**
  - [ ] How to deploy
  - [ ] How to rollback
  - [ ] How to access logs
  - [ ] How to debug issues
  - [ ] How to scale resources

- [ ] **Team Notified**
  - Deployment scheduled and communicated
  - Stakeholders informed
  - Maintenance window announced (if applicable)

### Phase 10: Pre-Deployment Testing (Required)

- [ ] **Smoke Tests Prepared**
  ```bash
  # Staging smoke tests
  npm run test:smoke:staging

  # Expected: All critical paths working
  ```

- [ ] **Docker Image Tested**
  ```bash
  # Pull latest image
  docker pull ghcr.io/yourusername/ai-affiliate-empire:latest

  # Run locally
  docker run -d -p 3000:3000 --env-file .env.test ghcr.io/yourusername/ai-affiliate-empire:latest

  # Test health endpoint
  curl http://localhost:3000/health
  ```

- [ ] **Load Testing Completed (Production)**
  ```bash
  # Run load tests on staging
  # Use tools like k6, Artillery, or Apache Bench

  # Example with ab
  ab -n 1000 -c 10 https://ai-affiliate-empire-staging.fly.dev/health

  # Verify performance metrics
  ```

## Deployment Execution Checklist

### Staging Deployment

- [ ] **Trigger Staging Deployment**
  ```bash
  # Option 1: Push to main branch (automatic)
  git push origin main

  # Option 2: Manual trigger via GitHub Actions
  gh workflow run cd.yml -f environment=staging
  ```

- [ ] **Monitor Deployment**
  ```bash
  # Watch GitHub Actions
  gh run watch

  # Watch Fly.io logs
  flyctl logs --app ai-affiliate-empire-staging
  ```

- [ ] **Verify Staging Deployment**
  ```bash
  # Health check
  curl https://ai-affiliate-empire-staging.fly.dev/health

  # Run smoke tests
  npm run test:smoke:staging

  # Manual testing of critical features
  ```

- [ ] **Staging Sign-Off**
  - All critical features working
  - No errors in logs
  - Performance acceptable
  - Security scans passed

### Production Deployment

- [ ] **Final Pre-Production Checks**
  - Staging deployment successful and verified
  - All stakeholders notified
  - Maintenance window scheduled (if needed)
  - Team on standby for monitoring

- [ ] **Create Production Backup**
  ```bash
  flyctl postgres backup create --app ai-affiliate-empire-db
  ```

- [ ] **Trigger Production Deployment**
  ```bash
  # Via GitHub Actions with manual approval
  gh workflow run cd.yml -f environment=production
  ```

- [ ] **Monitor Production Deployment**
  ```bash
  # Watch deployment progress
  gh run watch

  # Monitor application logs
  flyctl logs --app ai-affiliate-empire

  # Monitor error rates in Sentry
  ```

- [ ] **Verify Production Deployment**
  ```bash
  # Health check
  curl https://ai-affiliate-empire.fly.dev/health

  # Run smoke tests
  npm run test:smoke:production

  # Monitor metrics for anomalies
  ```

- [ ] **Post-Deployment Verification (15 minutes)**
  - [ ] Health checks passing
  - [ ] No spike in error rates
  - [ ] Response times normal
  - [ ] Database connections stable
  - [ ] No customer complaints

## Post-Deployment Checklist

- [ ] **Monitor for 24 Hours**
  - Watch error rates in Sentry
  - Monitor application logs
  - Track performance metrics
  - Review customer feedback

- [ ] **Update Documentation**
  - Document any issues encountered
  - Update runbooks with new learnings
  - Share deployment retrospective

- [ ] **Notify Stakeholders**
  - Deployment successful message
  - Release notes shared
  - Known issues communicated

## Rollback Checklist

If issues are detected during or after deployment:

- [ ] **Assess Severity**
  - Critical: Immediate rollback required
  - High: Rollback within 30 minutes
  - Medium: Fix forward or rollback within 2 hours
  - Low: Fix forward in next deployment

- [ ] **Execute Rollback**
  ```bash
  # Production rollback
  ./scripts/rollback.sh production

  # Verify rollback
  curl https://ai-affiliate-empire.fly.dev/health
  npm run test:smoke:production
  ```

- [ ] **Verify Rollback Successful**
  - Application functioning normally
  - Error rates returned to baseline
  - Customer impact minimized

- [ ] **Post-Rollback Actions**
  - Document what went wrong
  - Create fix plan
  - Schedule fix deployment
  - Communicate with stakeholders

## Deployment Metrics

Track these metrics for each deployment:

| Metric | Target | Staging | Production |
|--------|--------|---------|------------|
| Deployment duration | <10 min | __ min | __ min |
| Downtime | 0 min | __ min | __ min |
| Failed health checks | 0 | __ | __ |
| Error spike | No | Yes/No | Yes/No |
| Rollback required | No | Yes/No | Yes/No |
| Time to rollback | <5 min | __ min | __ min |

## Common Issues & Solutions

### Issue: Health check fails after deployment

**Symptoms**: `/health` endpoint returns 500 or times out

**Solutions**:
```bash
# Check application logs
flyctl logs --app ai-affiliate-empire

# Check database connectivity
flyctl ssh console --app ai-affiliate-empire -C "psql \$DATABASE_URL -c 'SELECT 1'"

# Restart application
flyctl apps restart ai-affiliate-empire

# Rollback if issue persists
./scripts/rollback.sh production
```

### Issue: Database migration fails

**Symptoms**: Application won't start, migration errors in logs

**Solutions**:
```bash
# Check migration status
flyctl ssh console --app ai-affiliate-empire -C "npx prisma migrate status"

# Resolve migration (if safe)
flyctl ssh console --app ai-affiliate-empire -C "npx prisma migrate resolve --applied <migration-name>"

# Or rollback database and deployment
./scripts/rollback.sh production
```

### Issue: High error rates after deployment

**Symptoms**: Sentry showing increased errors, customers reporting issues

**Solutions**:
```bash
# Check Sentry for error details
# Visit: https://sentry.io/organizations/your-org/projects/ai-affiliate-empire/

# Review recent code changes
git diff <previous-release> <current-release>

# Immediate rollback
./scripts/rollback.sh production

# Fix and redeploy
```

## Approval Gates

### Staging (Automatic)
- All CI checks must pass
- No manual approval required

### Production (Manual)
- Staging deployment must be successful
- Manual approval required from:
  - [ ] Tech Lead
  - [ ] Product Owner
  - [ ] DevOps Engineer (for infrastructure changes)

## Success Criteria

Deployment is considered successful when:

1. ✅ All health checks passing
2. ✅ No errors in application logs
3. ✅ All smoke tests passing
4. ✅ Response times within SLA
5. ✅ No customer complaints
6. ✅ Monitoring shows normal metrics

## Next Steps

After successful deployment:
1. ✅ Monitor for 24 hours
2. ✅ Update project documentation
3. ✅ Share deployment notes with team
4. ✅ Plan next deployment
5. ✅ Conduct deployment retrospective

## Additional Resources

- [Fly.io Deployment Guide](https://fly.io/docs/reference/configuration/)
- [GitHub Actions Deployment Docs](https://docs.github.com/en/actions/deployment)
- [Sentry Release Tracking](https://docs.sentry.io/product/releases/)
- [Rollback Procedures](./FIRST_DEPLOYMENT.md#rollback-procedures)
