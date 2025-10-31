# Deployment Rollback Runbook

**Last Updated**: 2025-10-31
**Owner**: DevOps/SRE Team
**Review Cycle**: Quarterly

## Overview

Step-by-step procedures for rolling back failed or problematic deployments in production and staging environments.

---

## When to Rollback

### Immediate Rollback Scenarios (< 5 minutes decision)

✅ **Rollback immediately if:**
- Health checks failing after deployment
- Error rate spike > 5% within 5 minutes of deployment
- Critical feature completely broken
- Database corruption detected
- Security vulnerability introduced
- Application crashes on startup
- Complete service outage

### Monitor Before Rollback (15-30 minutes)

⚠️ **Monitor and consider rollback if:**
- Error rate 2-5% (investigate first)
- Performance degradation < 50%
- Non-critical features broken
- Unexpected behavior in edge cases
- Minor data inconsistencies

### Don't Rollback For

❌ **Don't rollback for:**
- UI/UX issues only (unless critical)
- Minor bugs in new features
- Issues that can be hotfixed < 30 minutes
- Problems affecting < 1% of users
- Non-production environments (fix forward)

---

## Pre-Rollback Checklist

Before initiating rollback:

- [ ] Confirm issue is deployment-related (check deployment timestamp vs issue start)
- [ ] Verify issue severity warrants rollback
- [ ] Notify team in #incidents channel
- [ ] Document issue symptoms and error messages
- [ ] Take snapshot of current state for investigation
- [ ] Identify last known good version

```bash
# Identify when issue started
flyctl releases list --app ai-affiliate-empire | head -5

# Compare with deployment time
# If issue started within 30 min of deployment → likely deployment-related

# Check error logs for deployment-related errors
flyctl logs --app ai-affiliate-empire | grep -i "error\|fatal\|crash"

# Document current error rate
curl https://ai-affiliate-empire.fly.dev/metrics | grep http_request_errors_total
```

---

## Automated Rollback Procedure

### Using Rollback Script (Recommended)

```bash
# Rollback production
./scripts/rollback.sh production

# Rollback staging
./scripts/rollback.sh staging

# Script performs:
# 1. Validates environment and prerequisites
# 2. Identifies previous stable release
# 3. Creates database backup
# 4. Executes rollback via Fly.io
# 5. Waits for deployment stabilization
# 6. Runs health checks
# 7. Executes smoke tests
# 8. Sends notifications
```

### Script Output Example

```
🔄 Starting rollback for production environment...

✅ Prerequisites check passed
📋 Current version: v1.2.3 (release 145)
📋 Rolling back to: v1.2.2 (release 144)

❓ Rollback from v1.2.3 to v1.2.2? (y/n): y

💾 Creating database backup...
✅ Database backup created: backup-20251031-143022

🔄 Executing rollback...
✅ Rollback initiated (release 144)

⏳ Waiting for deployment stabilization (15 seconds)...
✅ Deployment stabilized

🏥 Running health checks...
  Attempt 1/10... ✅
  Attempt 2/10... ✅
✅ Health checks passed

🧪 Running smoke tests...
✅ All smoke tests passed

📊 Monitoring for 2 minutes...
✅ No anomalies detected

✅ Rollback completed successfully!

📝 Rollback logged to deployments.log
🔔 Notifications sent
```

---

## Manual Rollback Procedure

### Step 1: Identify Target Version

```bash
# List recent releases
flyctl releases list --app ai-affiliate-empire

# Example output:
# VERSION  STATUS    DESCRIPTION                             USER     DATE
# v145     complete  Deploy image: main-abc123               deploy   5 mins ago
# v144     complete  Deploy image: main-xyz789 (STABLE)      deploy   2 days ago
# v143     complete  Deploy image: main-def456               deploy   3 days ago

# Identify last known good version (usually previous version)
# Target: v144
```

### Step 2: Create Database Backup

```bash
# CRITICAL: Always backup before rollback

# Create backup
flyctl postgres backup create --app ai-affiliate-empire-db

# Verify backup created
flyctl postgres backups list --app ai-affiliate-empire-db

# Document backup ID
# Example: backup-20251031-143022
```

### Step 3: Execute Rollback

```bash
# Rollback to specific version
flyctl releases rollback v144 --app ai-affiliate-empire

# Or rollback to previous version (automatic)
flyctl releases rollback --app ai-affiliate-empire

# Monitor rollback progress
flyctl status --app ai-affiliate-empire

# Watch logs for any errors
flyctl logs --app ai-affiliate-empire -f
```

### Step 4: Wait for Stabilization

```bash
# Wait 15-20 seconds for deployment to stabilize
sleep 15

# Check deployment status
flyctl status --app ai-affiliate-empire

# Expected output:
# Instances
# ID       PROCESS VERSION REGION  DESIRED STATUS  HEALTH CHECKS      RESTARTS  CREATED
# abc123   app     v144    sjc     run     running 3 total, 3 passing 0         1m ago
# def456   app     v144    sjc     run     running 3 total, 3 passing 0         1m ago
```

### Step 5: Verify Health Checks

```bash
# Run health checks (10 attempts, 10 seconds apart)
for i in {1..10}; do
  echo "Health check attempt $i/10..."
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ai-affiliate-empire.fly.dev/health)

  if [ "$STATUS" = "200" ]; then
    echo "✅ Health check passed"
  else
    echo "❌ Health check failed (HTTP $STATUS)"
  fi

  sleep 10
done

# Check readiness endpoint
curl https://ai-affiliate-empire.fly.dev/health/ready

# Check all services
curl https://ai-affiliate-empire.fly.dev/health/services
```

### Step 6: Run Smoke Tests

```bash
# Execute smoke tests
npm run test:smoke:production

# Or manually test critical endpoints
curl -X GET https://ai-affiliate-empire.fly.dev/api/products | jq '.'
curl -X GET https://ai-affiliate-empire.fly.dev/api/analytics/summary | jq '.'
curl -X GET https://ai-affiliate-empire.fly.dev/api/workflows/status | jq '.'
```

### Step 7: Monitor Post-Rollback

```bash
# Monitor for 15-30 minutes after rollback

# Watch error rates in Sentry
# Access: https://sentry.io

# Check Grafana dashboards
# Access: http://localhost:3002 or Grafana cloud

# Monitor logs for errors
flyctl logs --app ai-affiliate-empire | grep -i "error\|fatal"

# Check metrics
curl https://ai-affiliate-empire.fly.dev/metrics | grep http_request_errors_total
```

### Step 8: Document & Notify

```bash
# Log rollback event
echo "$(date '+%Y-%m-%d %H:%M:%S') - Rollback from v145 to v144 - Reason: [REASON]" >> deployments.log

# Send notification to team
./.claude/send-discord.sh 'ROLLBACK COMPLETED: Production rolled back from v145 to v144. Reason: [REASON]. System healthy.'

# Update status page
# Set status: Operational
# Post incident update
```

---

## Database Rollback Considerations

### When Database Rollback is Needed

Rollback database if:
- Migration caused data corruption
- Schema incompatible with rolled-back application
- Foreign key violations after migration
- Critical data lost during migration

### Database Rollback Procedure

```bash
# 1. Identify pre-deployment database backup
flyctl postgres backups list --app ai-affiliate-empire-db

# Find backup created before the problematic deployment
# Example: backup-20251031-120000 (before v145 deployment)

# 2. Stop application to prevent writes
flyctl scale count 0 --app ai-affiliate-empire

# 3. Restore database from backup
flyctl postgres backup restore backup-20251031-120000 \
  --app ai-affiliate-empire-db

# 4. Verify database state
flyctl postgres connect --app ai-affiliate-empire-db

SELECT version();
SELECT COUNT(*) FROM products;
SELECT MAX(created_at) FROM products;  -- Should match backup time
\q

# 5. Rollback application to match database schema
flyctl releases rollback v144 --app ai-affiliate-empire

# 6. Restart application
flyctl scale count 2 --app ai-affiliate-empire

# 7. Verify integration
npm run test:smoke:production
```

### Migration Rollback (Without Full DB Restore)

```bash
# If only migration needs rollback, not entire database:

# 1. Connect to application
flyctl ssh console --app ai-affiliate-empire

# 2. Check migration status
npx prisma migrate status

# 3. Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20251031_problematic_migration

# 4. Manually revert schema changes
flyctl postgres connect --app ai-affiliate-empire-db

-- Drop tables created by migration
DROP TABLE IF EXISTS new_table CASCADE;

-- Revert column changes
ALTER TABLE products DROP COLUMN IF EXISTS new_column;

-- Restore modified columns
ALTER TABLE products ALTER COLUMN old_column SET NOT NULL;

\q

# 5. Rollback application code
flyctl releases rollback v144 --app ai-affiliate-empire

# 6. Verify schema compatibility
npm run test:smoke:production
```

---

## Rollback Verification Checklist

After rollback completion, verify:

### Application Health
- [ ] All instances running and healthy
- [ ] Health checks passing (GET /health → 200 OK)
- [ ] Database connectivity (GET /health/ready → 200 OK)
- [ ] External services accessible (GET /health/services → 200 OK)

### Functionality
- [ ] Critical API endpoints responding
- [ ] Content generation workflow operational
- [ ] Publishing workflow operational
- [ ] Analytics tracking functional
- [ ] Admin dashboard accessible

### Performance
- [ ] Response times < 3 seconds (p95)
- [ ] Error rate < 1%
- [ ] CPU usage < 70%
- [ ] Memory usage stable

### Data Integrity
- [ ] No data loss detected
- [ ] Database queries executing normally
- [ ] Foreign key constraints intact
- [ ] Recent data accessible

### Monitoring
- [ ] Sentry error rate normal
- [ ] Grafana metrics healthy
- [ ] Logs showing no errors
- [ ] Alerts cleared

```bash
# Automated verification script
./scripts/verify-rollback.sh

# Or manual verification
curl https://ai-affiliate-empire.fly.dev/health | jq '.'
curl https://ai-affiliate-empire.fly.dev/health/ready | jq '.'
npm run test:smoke:production
flyctl metrics --app ai-affiliate-empire
```

---

## Rollback Failure Recovery

### If Rollback Fails

#### Scenario 1: Rollback Command Fails

```bash
# Error: Cannot rollback to version v144

# Check release status
flyctl releases list --app ai-affiliate-empire

# Try rolling back by release number instead of version
flyctl releases rollback --to 144 --app ai-affiliate-empire

# If still failing, check Fly.io status
# https://status.fly.io

# Last resort: Deploy previous version as new deployment
flyctl deploy --image ghcr.io/yourusername/ai-affiliate-empire:v1.2.2
```

#### Scenario 2: Application Still Unhealthy After Rollback

```bash
# Check logs for root cause
flyctl logs --app ai-affiliate-empire | tail -100

# Common issues:
# 1. Database schema mismatch
#    → Rollback database (see Database Rollback section)

# 2. Environment variables changed
#    → Restore previous environment variables
flyctl secrets set KEY=old_value --app ai-affiliate-empire

# 3. External dependency failure
#    → Check external API status
#    → Enable mock mode temporarily
flyctl secrets set ENABLE_MOCK_MODE=true --app ai-affiliate-empire

# 4. Caching issue
#    → Clear application cache
flyctl ssh console --app ai-affiliate-empire
npm run cache:clear
```

#### Scenario 3: Database Restore Fails

```bash
# If primary backup restoration fails:

# 1. Try alternative backup
flyctl postgres backups list --app ai-affiliate-empire-db
flyctl postgres backup restore <alternative-backup-id> --app ai-affiliate-empire-db

# 2. If all backups fail, provision new database and restore manually
# Create new database
flyctl postgres create --name ai-affiliate-empire-db-temp --region sjc

# Download backup locally
flyctl ssh console --app ai-affiliate-empire-db
pg_dump -U postgres affiliate_empire > /tmp/backup.sql
exit

flyctl ssh sftp get /tmp/backup.sql backup.sql --app ai-affiliate-empire-db

# Restore to new database
flyctl ssh sftp put backup.sql /tmp/backup.sql --app ai-affiliate-empire-db-temp
flyctl ssh console --app ai-affiliate-empire-db-temp
psql -U postgres affiliate_empire < /tmp/backup.sql

# Update application to use new database
flyctl secrets set DATABASE_URL=<new-db-url> --app ai-affiliate-empire
```

### Emergency Escalation

If rollback cannot be completed:

1. **Page senior engineer** (< 5 minutes)
2. **Escalate to infrastructure team** (< 10 minutes)
3. **Consider emergency maintenance window**
4. **Prepare disaster recovery plan** (see disaster-recovery.md if exists)
5. **Communicate downtime to stakeholders**

---

## Post-Rollback Activities

### Immediate (Within 1 hour)

1. **Update Status**
   - Mark incident as resolved
   - Update status page
   - Notify all stakeholders

2. **Document Incident**
   ```bash
   # Create incident ticket
   # Include:
   # - What triggered rollback
   # - What version rolled back from/to
   # - How long it took
   # - Any complications
   ```

3. **Preserve Evidence**
   ```bash
   # Save logs from failed deployment
   flyctl logs --app ai-affiliate-empire > failed-deployment-v145.log

   # Save metrics/screenshots from Sentry/Grafana

   # Save database state if relevant
   ```

### Short-term (Within 24 hours)

1. **Root Cause Analysis**
   - Investigate why deployment failed
   - Identify gaps in testing/deployment process
   - Document findings

2. **Fix and Re-deploy**
   ```bash
   # Create fix in development
   # Test thoroughly in staging
   # Deploy fix when ready

   # Do NOT rush re-deployment
   # Ensure fix addresses root cause
   ```

3. **Update Runbooks**
   - Document any new scenarios encountered
   - Update rollback procedures if needed
   - Add to FAQ/known issues

### Long-term (Within 1 week)

1. **Write Post-Mortem**
   - Use incident-response.md template
   - Share with team
   - Schedule review meeting

2. **Improve Processes**
   - Update CI/CD pipeline if needed
   - Add missing tests
   - Enhance monitoring/alerts
   - Improve deployment safety checks

3. **Training**
   - Share lessons learned
   - Update team on new procedures
   - Practice rollback procedure

---

## Rollback Best Practices

### Before Deployment

1. **Test in Staging**
   - Always deploy to staging first
   - Soak test for at least 1 hour
   - Run full test suite

2. **Database Migrations**
   - Make migrations reversible
   - Test migration rollback in staging
   - Backup before production migration

3. **Feature Flags**
   - Use feature flags for risky features
   - Allows disabling without rollback
   ```typescript
   if (featureFlags.isEnabled('new_feature')) {
     // New code
   } else {
     // Old code
   }
   ```

4. **Gradual Rollout**
   - Deploy to single instance first
   - Monitor for 15 minutes
   - Scale to all instances if healthy

### During Deployment

1. **Monitor Actively**
   - Watch deployment logs
   - Check health checks
   - Monitor error rates
   - Stay available for 30 minutes post-deployment

2. **Have Rollback Ready**
   - Know rollback command
   - Have script ready to execute
   - Identify previous version beforehand

### After Rollback

1. **Don't Rush Re-deployment**
   - Fully understand root cause
   - Test fix thoroughly
   - Get peer review

2. **Improve Detection**
   - Add monitoring for issue that caused rollback
   - Add alerts if missing
   - Improve health checks

3. **Document Everything**
   - Update runbooks
   - Share learnings
   - Update team knowledge base

---

## Common Rollback Scenarios

### Scenario 1: Failed Health Checks

**Trigger**: Automatic rollback in CD pipeline

**Symptoms**:
- Health endpoint returning 500/503
- Instances marked unhealthy
- CD pipeline aborts deployment

**Resolution**:
```bash
# Automatic rollback triggered by CD pipeline
# Verify rollback completed
flyctl status --app ai-affiliate-empire

# Investigate failure
flyctl logs --app ai-affiliate-empire

# Fix and redeploy when ready
```

### Scenario 2: High Error Rate

**Trigger**: Manual rollback decision

**Symptoms**:
- Sentry error rate > 5%
- Specific errors in logs
- User complaints

**Resolution**:
```bash
# Decision: Rollback (error rate too high)
./scripts/rollback.sh production

# Investigate errors in Sentry
# Fix code
# Redeploy with fix
```

### Scenario 3: Database Migration Failure

**Trigger**: Manual rollback needed

**Symptoms**:
- Migration stuck/failed
- Schema errors in logs
- Database queries failing

**Resolution**:
```bash
# Rollback application
./scripts/rollback.sh production

# Rollback migration
flyctl ssh console --app ai-affiliate-empire
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore database if needed
flyctl postgres backup restore <backup-id> --app ai-affiliate-empire-db
```

### Scenario 4: Broken Critical Feature

**Trigger**: Manual rollback decision

**Symptoms**:
- Content generation failing
- Publishing not working
- Analytics not tracking

**Resolution**:
```bash
# Quick decision: Rollback
./scripts/rollback.sh production

# Investigate feature
# Create hotfix or wait for proper fix
# Redeploy when ready
```

---

## Related Runbooks

- [Incident Response](./incident-response.md) - General incident procedures
- [Database Issues](./database-issues.md) - Database-specific problems
- [Performance Degradation](./performance-degradation.md) - Performance issues

---

## Appendix: Quick Reference

### Rollback Commands

```bash
# Automated rollback (recommended)
./scripts/rollback.sh production

# Manual rollback to previous version
flyctl releases rollback --app ai-affiliate-empire

# Manual rollback to specific version
flyctl releases rollback v144 --app ai-affiliate-empire

# Database rollback
flyctl postgres backup restore <backup-id> --app ai-affiliate-empire-db

# Migration rollback
npx prisma migrate resolve --rolled-back <migration-name>
```

### Health Check Commands

```bash
# Basic health
curl https://ai-affiliate-empire.fly.dev/health

# Readiness
curl https://ai-affiliate-empire.fly.dev/health/ready

# Services
curl https://ai-affiliate-empire.fly.dev/health/services

# Smoke tests
npm run test:smoke:production
```

### Monitoring Commands

```bash
# Application status
flyctl status --app ai-affiliate-empire

# Logs
flyctl logs --app ai-affiliate-empire -f

# Metrics
flyctl metrics --app ai-affiliate-empire

# Releases
flyctl releases list --app ai-affiliate-empire
```

---

**Document Version**: 1.0
**Last Tested**: 2025-10-31
**Next Review**: 2026-01-31
