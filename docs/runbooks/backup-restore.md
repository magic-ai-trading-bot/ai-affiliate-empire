# Backup & Restore Runbook

**Last Updated**: 2025-10-31
**Owner**: Database/DevOps Team
**Review Cycle**: Monthly

## Overview

Comprehensive backup and restore procedures for AI Affiliate Empire, covering database, application state, media files, and disaster recovery scenarios.

---

## Backup Strategy

### Backup Types

| Type | Frequency | Retention | Purpose |
|------|-----------|-----------|---------|
| **Database Snapshots** | Hourly | 24 hours | Quick recovery from recent issues |
| **Daily Backups** | Daily 2 AM UTC | 30 days | Regular recovery point |
| **Weekly Backups** | Sunday 2 AM UTC | 12 weeks | Long-term recovery |
| **Monthly Backups** | 1st of month 2 AM UTC | 12 months | Compliance, audit |
| **Pre-deployment** | Before each prod deploy | 7 days | Rollback safety |
| **On-demand** | Manual | Variable | Testing, migration |

### What Gets Backed Up

1. **PostgreSQL Database**
   - All tables and data
   - Schema and migrations
   - Indexes and constraints
   - Extensions and functions

2. **Application Configuration**
   - Environment variables (encrypted)
   - Feature flags
   - Workflow schedules

3. **Media Files** (if stored locally)
   - Generated videos
   - Thumbnails
   - Voice files
   - Temporary files (excluded)

4. **Logs** (retention varies)
   - Application logs (7 days)
   - Access logs (30 days)
   - Audit logs (365 days)

---

## Daily Backup Verification

### Automated Verification

**Schedule**: Daily at 3 AM UTC (1 hour after backup)

**Procedure** (automated script):

```bash
#!/bin/bash
# scripts/verify-daily-backup.sh

# 1. Check backup exists
LATEST_BACKUP=$(flyctl postgres backups list --app ai-affiliate-empire-db --json | jq -r '.[0].id')

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ ERROR: No backup found"
  # Send alert
  exit 1
fi

# 2. Verify backup age (should be < 2 hours old)
BACKUP_TIME=$(flyctl postgres backups list --app ai-affiliate-empire-db --json | jq -r '.[0].created_at')
BACKUP_AGE=$(( $(date +%s) - $(date -d "$BACKUP_TIME" +%s) ))

if [ $BACKUP_AGE -gt 7200 ]; then
  echo "⚠️ WARNING: Backup is $((BACKUP_AGE / 3600)) hours old"
  # Send warning
fi

# 3. Verify backup size (should be within 20% of yesterday)
CURRENT_SIZE=$(flyctl postgres backups list --app ai-affiliate-empire-db --json | jq -r '.[0].size')
YESTERDAY_SIZE=$(flyctl postgres backups list --app ai-affiliate-empire-db --json | jq -r '.[1].size')

SIZE_DIFF=$(( (CURRENT_SIZE - YESTERDAY_SIZE) * 100 / YESTERDAY_SIZE ))

if [ ${SIZE_DIFF#-} -gt 20 ]; then
  echo "⚠️ WARNING: Backup size changed by ${SIZE_DIFF}%"
  # Investigate if expected
fi

# 4. Test backup integrity (weekly, full restore test in staging)
DOW=$(date +%u)  # Day of week (1=Monday)

if [ $DOW -eq 7 ]; then  # Sunday
  echo "📋 Running weekly restore test..."
  ./scripts/test-restore-staging.sh "$LATEST_BACKUP"
fi

echo "✅ Daily backup verification complete"
```

### Manual Verification (Weekly)

**Schedule**: Every Monday morning

**Checklist**:
```bash
# 1. List recent backups
flyctl postgres backups list --app ai-affiliate-empire-db

# Expected: 7 daily backups, 1 weekly backup

# 2. Check backup sizes
# Should be relatively consistent
# Sudden changes indicate potential issues

# 3. Verify backup accessibility
# Ensure backups can be listed and described

# 4. Review automated verification logs
tail -100 /var/log/backup-verification.log

# 5. Document any anomalies
# Update tracking spreadsheet
```

---

## Point-in-Time Restore Procedure

### Scenario: Restore to Specific Timestamp

**Use Case**: Data corruption detected, need to restore to specific point in time

**Prerequisites**:
- Identify exact timestamp to restore to
- Verify backup exists for that timeframe
- Get approval from stakeholders (data loss window)

**Procedure**:

#### 1. Identify Restore Point (5 minutes)

```bash
# Determine when corruption occurred
# Check application logs
flyctl logs --app ai-affiliate-empire | grep -i "error\|corrupt"

# Check database for bad data
flyctl postgres connect --app ai-affiliate-empire-db
SELECT * FROM products WHERE updated_at > '2025-10-31 14:00:00' LIMIT 10;
# Identify timestamp when data was last good

# Example: Restore to 2025-10-31 13:45:00 UTC
RESTORE_TIME="2025-10-31 13:45:00"
```

#### 2. Find Appropriate Backup (5 minutes)

```bash
# List backups around that time
flyctl postgres backups list --app ai-affiliate-empire-db

# Example output:
# ID     Created At              Size
# 12345  2025-10-31 14:00:00    1.2GB  (after corruption)
# 12344  2025-10-31 13:00:00    1.2GB  (before corruption) ← Use this

# Select backup BEFORE corruption
BACKUP_ID="12344"
```

#### 3. Stop Application (2 minutes)

```bash
# Prevent new writes during restore
flyctl scale count 0 --app ai-affiliate-empire

# Verify stopped
flyctl status --app ai-affiliate-empire
```

#### 4. Create Safety Backup (5 minutes)

```bash
# Backup current state (even if corrupted) for forensics
flyctl postgres backup create --app ai-affiliate-empire-db

# Wait for backup to complete
flyctl postgres backups list --app ai-affiliate-empire-db | head -1
```

#### 5. Perform Restore (10-30 minutes)

```bash
# Restore from backup
flyctl postgres backup restore $BACKUP_ID --app ai-affiliate-empire-db

# Monitor restoration progress
# Large databases may take 10-30 minutes

# Note: This OVERWRITES entire database
```

#### 6. Verify Restoration (10 minutes)

```bash
# Connect to database
flyctl postgres connect --app ai-affiliate-empire-db

-- Check restore timestamp
SELECT NOW();  -- Should be current time

-- Verify data before corruption
SELECT COUNT(*) FROM products WHERE updated_at < '2025-10-31 13:45:00';

-- Verify corrupted data is gone
SELECT COUNT(*) FROM products WHERE updated_at > '2025-10-31 13:45:00';
-- Should be 0 or less than before

-- Check critical data
SELECT id, name, updated_at FROM products ORDER BY updated_at DESC LIMIT 10;

-- Verify schema
\dt  -- List tables
\d products  -- Describe products table

\q
```

#### 7. Restart Application (5 minutes)

```bash
# Scale back up
flyctl scale count 2 --app ai-affiliate-empire

# Wait for instances to be healthy
sleep 30

# Check health
curl https://ai-affiliate-empire.fly.dev/health
curl https://ai-affiliate-empire.fly.dev/health/ready

# Run smoke tests
npm run test:smoke:production
```

#### 8. Verify Application Functionality (10 minutes)

```bash
# Test critical endpoints
curl https://ai-affiliate-empire.fly.dev/api/products | jq '.' | head -20
curl https://ai-affiliate-empire.fly.dev/api/analytics/summary | jq '.'

# Check Temporal workflows
# Access Temporal UI
# Verify workflows running normally

# Monitor for 30 minutes
# Watch for errors in Sentry
# Check Grafana metrics
```

#### 9. Communicate Data Loss (15 minutes)

```
To: Engineering Team, Stakeholders
Subject: Database Restored to Point-in-Time

Summary:
- Detected data corruption at 14:00 UTC
- Restored database to 13:45 UTC (before corruption)
- Data loss window: 13:45 - 14:00 (15 minutes)

Impact:
- [X] records created during this window are lost
- [X] updates during this window are lost
- Workflow executions during this window may need re-running

Actions Taken:
- Corruption identified and analyzed
- Database restored from backup #12344
- Application verified and operational

Next Steps:
- Root cause analysis of corruption
- Recovery of lost data if possible (from logs, etc.)
- Preventive measures to avoid recurrence

Questions: Contact DevOps team
```

#### 10. Post-Restore Activities

```bash
# 1. Investigate corruption cause
# - Review application logs
# - Check for bugs in recent deployments
# - Verify data validation

# 2. Attempt to recover lost data
# - Check application logs for create/update operations
# - Replay from logs if possible
# - Contact affected users if applicable

# 3. Document incident
# - Create post-mortem
# - Update runbooks with learnings
# - Add preventive measures
```

---

## Testing Restore in Staging

### Weekly Restore Test

**Schedule**: Every Sunday 4 AM UTC

**Purpose**: Verify backups are restorable and validate recovery procedures

**Automated Script**:

```bash
#!/bin/bash
# scripts/test-restore-staging.sh

BACKUP_ID=$1

echo "🧪 Testing restore of backup $BACKUP_ID in staging..."

# 1. Stop staging application
echo "Stopping staging application..."
flyctl scale count 0 --app ai-affiliate-empire-staging

# 2. Restore to staging database
echo "Restoring backup to staging database..."
flyctl postgres backup restore $BACKUP_ID --app ai-affiliate-empire-staging-db

# 3. Wait for restore to complete
echo "Waiting for restore to complete..."
sleep 60

# 4. Verify database
echo "Verifying database..."
flyctl postgres connect --app ai-affiliate-empire-staging-db <<EOF
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as analytics_count FROM analytics_events;
\dt
\q
EOF

# 5. Start staging application
echo "Starting staging application..."
flyctl scale count 1 --app ai-affiliate-empire-staging

# 6. Wait for application to start
echo "Waiting for application to start..."
sleep 30

# 7. Run health checks
echo "Running health checks..."
curl https://ai-affiliate-empire-staging.fly.dev/health
curl https://ai-affiliate-empire-staging.fly.dev/health/ready

# 8. Run smoke tests
echo "Running smoke tests..."
npm run test:smoke:staging

# 9. Report results
if [ $? -eq 0 ]; then
  echo "✅ Restore test PASSED"
  # Send success notification
  ./.claude/send-discord.sh "✅ Weekly backup restore test PASSED for backup $BACKUP_ID"
else
  echo "❌ Restore test FAILED"
  # Send failure alert
  ./.claude/send-discord.sh "🚨 Weekly backup restore test FAILED for backup $BACKUP_ID - URGENT: Investigate immediately"
  exit 1
fi
```

### Manual Restore Test (Monthly)

**Schedule**: First Sunday of each month

**Extended Testing**:

```bash
# 1. Perform automated restore test
./scripts/test-restore-staging.sh $(flyctl postgres backups list --app ai-affiliate-empire-db --json | jq -r '.[0].id')

# 2. Verify data integrity
flyctl postgres connect --app ai-affiliate-empire-staging-db

-- Check row counts match production (approximately)
SELECT 'products' as table_name, COUNT(*) FROM products
UNION ALL
SELECT 'analytics_events', COUNT(*) FROM analytics_events
UNION ALL
SELECT 'categories', COUNT(*) FROM categories;

-- Check for foreign key integrity
SELECT COUNT(*) FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE c.id IS NULL AND p.category_id IS NOT NULL;
-- Should be 0

-- Check for data quality
SELECT COUNT(*) FROM products WHERE name IS NULL OR price IS NULL;
-- Should be 0

\q

# 3. Test application functionality
# - Login to staging dashboard
# - Create test product
# - Generate test content
# - Verify workflows work
# - Check analytics display

# 4. Performance testing
# Run load test against staging
k6 run load-test.js

# 5. Document results
echo "Monthly restore test completed on $(date)" >> restore-test-log.txt
echo "Backup ID: $BACKUP_ID" >> restore-test-log.txt
echo "Result: PASS/FAIL" >> restore-test-log.txt
echo "Notes: [Any observations]" >> restore-test-log.txt
```

---

## Backup Retention Policy

### Automatic Retention

```bash
# Fly.io automatic retention (configured)
# - Hourly: 24 hours
# - Daily: 30 days
# - Weekly: 12 weeks

# Custom retention script (for extended retention)
#!/bin/bash
# scripts/manage-backup-retention.sh

# Get all backups
BACKUPS=$(flyctl postgres backups list --app ai-affiliate-empire-db --json)

# Keep monthly backups for 12 months
MONTHLY=$(echo "$BACKUPS" | jq -r '.[] | select(.created_at | strptime("%Y-%m-%d") | .day == 1) | .id')

# Delete backups older than retention policy
# (except monthly backups)
echo "$BACKUPS" | jq -r '.[] | select(.created_at < (now - 31536000))' | while read backup; do
  BACKUP_ID=$(echo "$backup" | jq -r '.id')

  if ! echo "$MONTHLY" | grep -q "$BACKUP_ID"; then
    echo "Deleting old backup: $BACKUP_ID"
    # flyctl postgres backup delete $BACKUP_ID --app ai-affiliate-empire-db
  fi
done
```

### Compliance Requirements

**Data Retention for Compliance**:
- Financial data: 7 years
- User data: As per GDPR/CCPA (duration + 30 days after deletion request)
- Audit logs: 1 year minimum
- Transaction records: 3 years

**Archive to Long-term Storage**:

```bash
# Export monthly backup to S3 for long-term storage
#!/bin/bash

# 1. Create backup
BACKUP_ID=$(flyctl postgres backup create --app ai-affiliate-empire-db | grep -oP 'ID: \K\d+')

# 2. Download backup
flyctl postgres backup download $BACKUP_ID --app ai-affiliate-empire-db > backup-$(date +%Y%m).sql

# 3. Compress
gzip backup-$(date +%Y%m).sql

# 4. Upload to S3
aws s3 cp backup-$(date +%Y%m).sql.gz s3://ai-affiliate-empire-backups/postgres/monthly/

# 5. Verify upload
aws s3 ls s3://ai-affiliate-empire-backups/postgres/monthly/backup-$(date +%Y%m).sql.gz

# 6. Clean up local file
rm backup-$(date +%Y%m).sql.gz

# 7. Tag with retention policy
aws s3api put-object-tagging \
  --bucket ai-affiliate-empire-backups \
  --key postgres/monthly/backup-$(date +%Y%m).sql.gz \
  --tagging 'TagSet=[{Key=retention,Value=7years}]'
```

---

## Disaster Recovery Scenarios

### Scenario 1: Database Corruption

**Detection**: Data integrity checks failing

**Recovery**:
1. Identify corruption extent
2. Stop application
3. Restore from last good backup (see Point-in-Time Restore)
4. Verify data integrity
5. Investigate root cause
6. Implement preventive measures

**RTO**: 30 minutes
**RPO**: Up to 1 hour (hourly backups)

### Scenario 2: Complete Database Loss

**Detection**: Database server unreachable, unrecoverable

**Recovery**:

```bash
# 1. Provision new database
flyctl postgres create \
  --name ai-affiliate-empire-db-new \
  --region sjc \
  --initial-cluster-size 2

# 2. Restore from latest backup
LATEST_BACKUP=$(flyctl postgres backups list --app ai-affiliate-empire-db --json | jq -r '.[0].id')
flyctl postgres backup restore $LATEST_BACKUP --app ai-affiliate-empire-db-new

# 3. Update application to use new database
NEW_DB_URL=$(flyctl postgres attach --app ai-affiliate-empire ai-affiliate-empire-db-new)
flyctl secrets set DATABASE_URL=$NEW_DB_URL --app ai-affiliate-empire

# 4. Verify and restart
flyctl apps restart ai-affiliate-empire
npm run test:smoke:production
```

**RTO**: 1-2 hours
**RPO**: Up to 1 hour

### Scenario 3: Region Outage (Fly.io)

**Detection**: All instances in region unreachable

**Recovery**:

```bash
# 1. Deploy to alternative region
flyctl regions add lax  # Los Angeles as failover

# 2. Scale to new region
flyctl scale count 2 --region lax

# 3. Database: Restore in new region
flyctl postgres create --name ai-affiliate-empire-db-lax --region lax
flyctl postgres backup restore $LATEST_BACKUP --app ai-affiliate-empire-db-lax

# 4. Update DNS to point to new region
# Via Cloudflare or DNS provider

# 5. Verify functionality
curl https://ai-affiliate-empire.fly.dev/health
```

**RTO**: 2-4 hours
**RPO**: Up to 1 hour

### Scenario 4: Account Compromise

**Detection**: Unauthorized access to Fly.io account

**Recovery**:

```bash
# 1. Immediately revoke all access tokens
# Via Fly.io dashboard

# 2. Reset account password and enable MFA

# 3. Audit all changes made during compromise

# 4. Restore from backups before compromise
# Follow Point-in-Time Restore procedure

# 5. Rotate all credentials
./scripts/emergency-credential-rotation.sh

# 6. Verify security
# Run security audit
# Check for backdoors
```

**RTO**: 4-8 hours
**RPO**: Minimal (restore to before compromise)

### Scenario 5: Application Code Bug (Data Loss)

**Detection**: Bug in code causing data deletion/corruption

**Recovery**:

```bash
# 1. Immediate: Stop application
flyctl scale count 0 --app ai-affiliate-empire

# 2. Rollback application to stable version
./scripts/rollback.sh production

# 3. Assess data damage
flyctl postgres connect --app ai-affiliate-empire-db
-- Check what data was affected

# 4. If data loss, restore from backup before bug deployment
# Use Point-in-Time Restore to time before deployment

# 5. Restart application with fixed version
flyctl scale count 2 --app ai-affiliate-empire

# 6. Attempt to recover lost operations from logs
# Parse application logs
# Replay create/update operations
```

**RTO**: 30-60 minutes
**RPO**: Time since deployment (minimize with quick detection)

---

## Media File Backups

### Cloudflare R2 Backup Strategy

**If using R2 for video/image storage**:

```bash
# 1. Enable versioning on R2 bucket
# Via Cloudflare dashboard

# 2. Lifecycle policy for old versions
# Keep versions for 30 days

# 3. Replicate to secondary bucket (disaster recovery)
# Set up replication in Cloudflare

# 4. Periodic backup to S3
rclone sync r2:ai-affiliate-empire-media s3:backup-bucket/media/ \
  --exclude "temp/**" \
  --transfers 4

# 5. Verify backup
rclone check r2:ai-affiliate-empire-media s3:backup-bucket/media/
```

### Restoring Media Files

```bash
# Restore all media from backup
rclone sync s3:backup-bucket/media/ r2:ai-affiliate-empire-media/ \
  --transfers 4

# Verify restoration
rclone check s3:backup-bucket/media/ r2:ai-affiliate-empire-media/

# Or restore specific files
rclone copy s3:backup-bucket/media/videos/2025/10/ r2:ai-affiliate-empire-media/videos/2025/10/
```

---

## Backup Monitoring & Alerts

### Backup Health Checks

```yaml
# Prometheus alerts for backup health

- alert: BackupMissing
  expr: time() - backup_last_success_timestamp > 7200  # 2 hours
  labels:
    severity: critical
  annotations:
    summary: "No backup in last 2 hours"
    description: "Last successful backup was {{ $value | humanizeDuration }} ago"

- alert: BackupFailed
  expr: backup_last_status != 1
  labels:
    severity: critical
  annotations:
    summary: "Last backup failed"
    description: "Check backup logs for details"

- alert: BackupSizeAnomal
  expr: abs(backup_size_bytes - avg_over_time(backup_size_bytes[7d])) / avg_over_time(backup_size_bytes[7d]) > 0.30
  labels:
    severity: warning
  annotations:
    summary: "Backup size changed significantly"
    description: "Current: {{ $value }}, investigate if expected"

- alert: RestoreTestFailed
  expr: restore_test_last_status != 1
  labels:
    severity: critical
  annotations:
    summary: "Restore test failed"
    description: "Backups may not be restorable - investigate immediately"
```

### Backup Notifications

```bash
# Send daily backup summary
#!/bin/bash
# scripts/backup-summary.sh

BACKUP_COUNT=$(flyctl postgres backups list --app ai-affiliate-empire-db --json | jq '. | length')
LATEST_BACKUP=$(flyctl postgres backups list --app ai-affiliate-empire-db --json | jq -r '.[0] | "\(.created_at) - \(.size)"')

MESSAGE="📊 Daily Backup Summary
- Total backups: $BACKUP_COUNT
- Latest: $LATEST_BACKUP
- Status: ✅ Healthy"

./.claude/send-discord.sh "$MESSAGE"
```

---

## Backup Documentation

### Backup Inventory

**Maintain inventory spreadsheet with**:
- Backup ID
- Created timestamp
- Size
- Type (hourly/daily/weekly/monthly)
- Retention until
- Notes

### Backup Procedures Log

```bash
# Log all backup-related activities
# /var/log/backup-procedures.log

2025-10-31 14:30:00 - Manual backup created: ID 12345 - Pre-deployment
2025-10-31 15:00:00 - Restore test passed for backup 12344
2025-10-31 16:00:00 - Point-in-time restore performed to 13:45 UTC
```

---

## Related Runbooks

- [Database Issues](./database-issues.md#3-database-backuprestore) - Database backup/restore
- [Deployment Rollback](./deployment-rollback.md) - Application rollback with database
- [Incident Response](./incident-response.md) - Disaster recovery
- [Security Incidents](./security-incidents.md) - Security-related restores

---

**Document Version**: 1.0
**Last Tested**: 2025-10-31
**Next Review**: 2025-11-30
