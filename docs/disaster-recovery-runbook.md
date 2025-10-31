# Disaster Recovery Runbook

## Overview

This runbook provides step-by-step procedures for recovering the AI Affiliate Empire database in various disaster scenarios. Follow these procedures carefully to minimize downtime and data loss.

**RTO (Recovery Time Objective):** < 1 hour
**RPO (Recovery Point Objective):** < 1 day (24 hours)

## Table of Contents

1. [Emergency Contact Information](#emergency-contact-information)
2. [Pre-Disaster Preparation](#pre-disaster-preparation)
3. [Disaster Scenarios](#disaster-scenarios)
4. [Recovery Procedures](#recovery-procedures)
5. [Post-Recovery Validation](#post-recovery-validation)
6. [Rollback Procedures](#rollback-procedures)
7. [Communication Protocol](#communication-protocol)
8. [Testing Schedule](#testing-schedule)

---

## Emergency Contact Information

### Primary On-Call
- **Database Administrator:** [Your Name]
- **Phone:** [Your Phone]
- **Email:** [Your Email]

### Backup Contacts
- **DevOps Lead:** [Name]
- **CTO:** [Name]
- **System Administrator:** [Name]

### External Services
- **AWS Support:** 1-888-XXX-XXXX
- **PostgreSQL Support:** [If applicable]
- **Fly.io Support:** support@fly.io

---

## Pre-Disaster Preparation

### Daily Checks
- [ ] Verify automated backups completed successfully
- [ ] Check backup file integrity
- [ ] Verify S3 backup upload (if enabled)
- [ ] Monitor backup storage space
- [ ] Review database logs for errors

### Weekly Checks
- [ ] Test backup restoration in staging
- [ ] Verify backup retention policy
- [ ] Check backup encryption
- [ ] Validate metadata files
- [ ] Review access logs

### Monthly Checks
- [ ] Full DR drill execution
- [ ] Update DR runbook
- [ ] Review RTO/RPO metrics
- [ ] Audit backup security
- [ ] Test cross-region recovery

---

## Disaster Scenarios

### Scenario 1: Database Corruption
**Symptoms:**
- Query errors
- Data inconsistencies
- Transaction failures
- Replication lag

**Severity:** High
**Expected RTO:** 30-60 minutes
**Procedure:** [Recovery Procedure A](#recovery-procedure-a-database-corruption)

---

### Scenario 2: Complete Data Loss
**Symptoms:**
- Database unavailable
- Connection refused
- Catastrophic hardware failure
- Ransomware attack

**Severity:** Critical
**Expected RTO:** 45-60 minutes
**Procedure:** [Recovery Procedure B](#recovery-procedure-b-complete-data-loss)

---

### Scenario 3: Partial Data Loss
**Symptoms:**
- Missing tables or records
- Incomplete transactions
- Accidental deletion

**Severity:** Medium
**Expected RTO:** 30-45 minutes
**Procedure:** [Recovery Procedure C](#recovery-procedure-c-partial-data-loss)

---

### Scenario 4: Region Failure
**Symptoms:**
- AWS region outage
- Network connectivity issues
- Multi-AZ failure

**Severity:** Critical
**Expected RTO:** 60 minutes
**Procedure:** [Recovery Procedure D](#recovery-procedure-d-region-failure)

---

## Recovery Procedures

### Recovery Procedure A: Database Corruption

#### Step 1: Assess the Damage
```bash
# Check database connectivity
psql -d "$DATABASE_URL" -c "SELECT 1;"

# Check for corrupted tables
psql -d "$DATABASE_URL" -c "
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"

# Check database integrity
psql -d "$DATABASE_URL" -c "
SELECT datname, age(datfrozenxid)
FROM pg_database
WHERE datname = 'ai_affiliate_empire';
"
```

**Time Estimate:** 5 minutes

#### Step 2: Stop Application Traffic
```bash
# Scale down application instances
fly scale count 0 -a ai-affiliate-empire

# Verify no active connections
psql -d postgres -c "
SELECT count(*)
FROM pg_stat_activity
WHERE datname = 'ai_affiliate_empire';
"
```

**Time Estimate:** 2 minutes

#### Step 3: Create Safety Backup
```bash
# Emergency backup before recovery
cd /path/to/ai-affiliate-empire
./scripts/disaster-recovery/backup-database.sh \
  -e production \
  -o ./backups/emergency \
  -n
```

**Time Estimate:** 5-10 minutes

#### Step 4: Identify Latest Valid Backup
```bash
# List available backups
ls -lht ./backups/ | head -10

# Verify backup integrity
./scripts/disaster-recovery/verify-backup-integrity.sh \
  -b ./backups/backup_production_YYYYMMDD_HHMMSS.sql.gz \
  -d
```

**Time Estimate:** 3 minutes

#### Step 5: Restore from Backup
```bash
# Restore database
./scripts/disaster-recovery/restore-database.sh \
  -e production \
  -b ./backups/backup_production_YYYYMMDD_HHMMSS.sql.gz \
  -f
```

**Time Estimate:** 10-20 minutes

#### Step 6: Validate Restoration
```bash
# Verify table count
psql -d "$DATABASE_URL" -c "
SELECT count(*)
FROM information_schema.tables
WHERE table_schema = 'public';
"

# Verify critical data
psql -d "$DATABASE_URL" -c "
SELECT 'Products' as table_name, count(*) FROM \"Product\"
UNION ALL
SELECT 'Videos', count(*) FROM \"Video\"
UNION ALL
SELECT 'Publications', count(*) FROM \"Publication\";
"

# Check database size
psql -d "$DATABASE_URL" -c "
SELECT pg_size_pretty(pg_database_size('ai_affiliate_empire'));
"
```

**Time Estimate:** 5 minutes

#### Step 7: Restart Application
```bash
# Scale up application
fly scale count 2 -a ai-affiliate-empire

# Monitor application logs
fly logs -a ai-affiliate-empire
```

**Time Estimate:** 5 minutes

**Total RTO:** 35-50 minutes

---

### Recovery Procedure B: Complete Data Loss

#### Step 1: Declare Incident
- Notify stakeholders immediately
- Document incident start time
- Activate incident response team

**Time Estimate:** 2 minutes

#### Step 2: Download Latest Backup from S3
```bash
# List S3 backups
aws s3 ls s3://ai-affiliate-empire-backups/database-backups/production/ \
  --recursive | sort | tail -5

# Download latest backup
./scripts/disaster-recovery/restore-database.sh \
  -e production \
  -s \
  -d
```

**Time Estimate:** 5-10 minutes (depends on backup size)

#### Step 3: Verify Backup Integrity
```bash
# Comprehensive verification
./scripts/disaster-recovery/verify-backup-integrity.sh \
  -b /tmp/backup_production_YYYYMMDD_HHMMSS.sql.gz \
  -d \
  -r ./dr-verification-report.txt
```

**Time Estimate:** 3 minutes

#### Step 4: Provision New Database (if needed)
```bash
# For AWS RDS
aws rds create-db-instance \
  --db-instance-identifier ai-affiliate-empire-restore \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --allocated-storage 100 \
  --master-username admin \
  --master-user-password [SECURE_PASSWORD]

# For Fly.io Postgres
fly pg create --name ai-affiliate-empire-db-new
```

**Time Estimate:** 10-15 minutes

#### Step 5: Restore Database
```bash
# Update DATABASE_URL in environment
export DATABASE_URL="postgresql://user:pass@new-host:5432/ai_affiliate_empire"

# Perform restoration
./scripts/disaster-recovery/restore-database.sh \
  -e production \
  -b /tmp/backup_production_YYYYMMDD_HHMMSS.sql.gz \
  -f
```

**Time Estimate:** 15-25 minutes

#### Step 6: Update Application Configuration
```bash
# Update Fly.io secrets
fly secrets set DATABASE_URL="[NEW_DATABASE_URL]" -a ai-affiliate-empire

# Restart application
fly apps restart ai-affiliate-empire
```

**Time Estimate:** 5 minutes

#### Step 7: Comprehensive Validation
See [Post-Recovery Validation](#post-recovery-validation)

**Time Estimate:** 10 minutes

**Total RTO:** 50-70 minutes

---

### Recovery Procedure C: Partial Data Loss

#### Step 1: Identify Lost Data
```bash
# Check what data is missing
psql -d "$DATABASE_URL" -c "
SELECT tablename, n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY tablename;
"

# Check for missing tables
psql -d "$DATABASE_URL" -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
"
```

**Time Estimate:** 5 minutes

#### Step 2: Prepare Staging Database
```bash
# Create temporary database
psql -d postgres -c "CREATE DATABASE ai_affiliate_empire_staging;"

# Restore backup to staging
./scripts/disaster-recovery/restore-database.sh \
  -e production \
  -b ./backups/backup_production_YYYYMMDD_HHMMSS.sql.gz \
  -t ai_affiliate_empire_staging \
  -f
```

**Time Estimate:** 15 minutes

#### Step 3: Export Missing Data
```bash
# Dump specific tables
pg_dump -d ai_affiliate_empire_staging \
  -t "Product" \
  -t "Video" \
  --data-only \
  --inserts \
  > ./missing_data.sql
```

**Time Estimate:** 5 minutes

#### Step 4: Import to Production
```bash
# Import missing data
psql -d "$DATABASE_URL" < ./missing_data.sql

# Verify import
psql -d "$DATABASE_URL" -c "
SELECT 'Product' as table_name, count(*) FROM \"Product\"
UNION ALL
SELECT 'Video', count(*) FROM \"Video\";
"
```

**Time Estimate:** 10 minutes

#### Step 5: Clean Up
```bash
# Drop staging database
psql -d postgres -c "DROP DATABASE ai_affiliate_empire_staging;"

# Remove temporary files
rm ./missing_data.sql
```

**Time Estimate:** 2 minutes

**Total RTO:** 37 minutes

---

### Recovery Procedure D: Region Failure

#### Step 1: Activate DR Region
```bash
# Switch to backup region
export AWS_REGION="us-west-2"

# Verify backup availability
aws s3 ls s3://ai-affiliate-empire-backups-west/database-backups/production/
```

**Time Estimate:** 3 minutes

#### Step 2: Provision Database in New Region
```bash
# Create RDS instance in backup region
aws rds create-db-instance \
  --db-instance-identifier ai-affiliate-empire-dr \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --region us-west-2 \
  --allocated-storage 100
```

**Time Estimate:** 15 minutes

#### Step 3: Restore from Cross-Region Backup
```bash
# Download backup from backup region
aws s3 cp s3://ai-affiliate-empire-backups-west/database-backups/production/latest.sql.gz \
  ./backup.sql.gz \
  --region us-west-2

# Restore database
./scripts/disaster-recovery/restore-database.sh \
  -e production \
  -b ./backup.sql.gz \
  -f
```

**Time Estimate:** 20 minutes

#### Step 4: Update DNS and Load Balancers
```bash
# Update Route 53 records
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-update.json

# Update application environment
fly secrets set DATABASE_URL="[NEW_REGION_URL]" -a ai-affiliate-empire
```

**Time Estimate:** 10 minutes

#### Step 5: Verify Cross-Region Operation
```bash
# Test application endpoints
curl https://api.aiaffiliateempire.com/health

# Monitor logs
fly logs -a ai-affiliate-empire | grep ERROR
```

**Time Estimate:** 5 minutes

**Total RTO:** 53 minutes

---

## Post-Recovery Validation

### Validation Checklist

#### 1. Database Connectivity
```bash
# Test connection
psql -d "$DATABASE_URL" -c "SELECT version();"
```
**Expected:** PostgreSQL version information
**Status:** [ ] PASS [ ] FAIL

#### 2. Schema Integrity
```bash
# Verify tables
psql -d "$DATABASE_URL" -c "
SELECT count(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
"
```
**Expected:** 15+ tables
**Status:** [ ] PASS [ ] FAIL

#### 3. Data Completeness
```bash
# Check record counts
psql -d "$DATABASE_URL" -c "
SELECT
  (SELECT count(*) FROM \"Product\") as products,
  (SELECT count(*) FROM \"Video\") as videos,
  (SELECT count(*) FROM \"Publication\") as publications,
  (SELECT count(*) FROM \"Blog\") as blogs;
"
```
**Expected:** Non-zero counts
**Status:** [ ] PASS [ ] FAIL

#### 4. Index Health
```bash
# Verify indexes
psql -d "$DATABASE_URL" -c "
SELECT count(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public';
"
```
**Expected:** 20+ indexes
**Status:** [ ] PASS [ ] FAIL

#### 5. Foreign Key Constraints
```bash
# Check constraints
psql -d "$DATABASE_URL" -c "
SELECT count(*) as constraint_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public';
"
```
**Expected:** 10+ constraints
**Status:** [ ] PASS [ ] FAIL

#### 6. Application Functionality
```bash
# Test API endpoints
curl -X GET https://api.aiaffiliateempire.com/api/products | jq '.'
curl -X GET https://api.aiaffiliateempire.com/api/videos | jq '.'
```
**Expected:** Valid JSON responses
**Status:** [ ] PASS [ ] FAIL

#### 7. Recent Data Verification
```bash
# Check latest records
psql -d "$DATABASE_URL" -c "
SELECT max(\"createdAt\") as latest_product FROM \"Product\";
"
```
**Expected:** Recent timestamp (within RPO)
**Status:** [ ] PASS [ ] FAIL

#### 8. Database Performance
```bash
# Test query performance
time psql -d "$DATABASE_URL" -c "
SELECT count(*) FROM \"Product\" WHERE status = 'ACTIVE';
"
```
**Expected:** < 100ms
**Status:** [ ] PASS [ ] FAIL

---

## Rollback Procedures

### When to Rollback
- Restored data is corrupted
- Application errors after restoration
- Data integrity issues detected
- Performance degradation

### Rollback Steps

#### 1. Identify Safety Backup
```bash
# List safety backups
ls -lht ./backups/safety/
```

#### 2. Restore Safety Backup
```bash
# Restore pre-recovery state
./scripts/disaster-recovery/restore-database.sh \
  -e production \
  -b ./backups/safety/pre_restore_production_YYYYMMDD_HHMMSS.sql \
  -f
```

#### 3. Validate Rollback
```bash
# Verify restoration
psql -d "$DATABASE_URL" -c "
SELECT count(*) FROM \"Product\";
"
```

#### 4. Notify Stakeholders
- Send rollback notification
- Document reason for rollback
- Schedule retry with corrective actions

---

## Communication Protocol

### Incident Declaration
**Template:**
```
INCIDENT DECLARED: Database Recovery Required

Environment: [Production/Staging]
Severity: [Critical/High/Medium]
Scenario: [Corruption/Data Loss/Region Failure]
Start Time: [YYYY-MM-DD HH:MM UTC]
Expected RTO: [X minutes]
DBA On-Call: [Name]

Current Status:
- [Step 1]: In Progress
- Application: Down
- ETA to Recovery: [X minutes]

Next Update: [15 minutes]
```

### Status Updates
Send updates every 15 minutes to:
- Slack #incidents channel
- Discord webhook (configured)
- Email distribution list
- Status page

### Recovery Completion
**Template:**
```
RECOVERY COMPLETED

Environment: Production
Total Downtime: [X minutes]
RTO Target Met: [Yes/No]
RPO Data Loss: [X hours]

Validation Status:
✓ Database connectivity
✓ Schema integrity
✓ Data completeness
✓ Application functionality

Post-Incident Review scheduled for: [Date/Time]
```

---

## Testing Schedule

### Quarterly DR Drill
**Schedule:** Every 3 months (Jan, Apr, Jul, Oct)
**Duration:** 2-4 hours
**Participants:** DBA, DevOps, Dev Lead, CTO

#### Drill Checklist
- [ ] Schedule drill date/time
- [ ] Notify all participants
- [ ] Prepare test environment
- [ ] Execute full recovery procedure
- [ ] Document drill results
- [ ] Review and update runbook
- [ ] Address identified gaps
- [ ] Schedule next drill

#### Success Criteria
- [ ] RTO < 60 minutes achieved
- [ ] RPO < 24 hours validated
- [ ] All validation checks passed
- [ ] Zero data loss detected
- [ ] Application fully functional
- [ ] Team executed confidently

### Monthly Backup Tests
- Verify backup creation
- Test backup integrity
- Validate metadata
- Check storage space
- Test S3 replication (if enabled)

### Weekly Monitoring
- Backup completion alerts
- Storage capacity
- Backup size trends
- Retention policy compliance
- Access audit logs

---

## Scripts Reference

### Backup Script
```bash
./scripts/disaster-recovery/backup-database.sh -h
```

### Restore Script
```bash
./scripts/disaster-recovery/restore-database.sh -h
```

### Verification Script
```bash
./scripts/disaster-recovery/verify-backup-integrity.sh -h
```

### DR Test Script
```bash
./scripts/disaster-recovery/test-dr-procedure.sh -h
```

---

## Appendix

### A. Common Issues and Resolutions

#### Issue: pg_dump Permission Denied
**Solution:**
```bash
# Use DIRECT_DATABASE_URL
export DATABASE_URL="$DIRECT_DATABASE_URL"
```

#### Issue: Backup File Corrupted
**Solution:**
```bash
# Use previous backup
# Verify with checksums
./scripts/disaster-recovery/verify-backup-integrity.sh -b [backup_file]
```

#### Issue: Restore Takes Too Long
**Solution:**
```bash
# Disable indexes during restore
# Restore schema first, then data
# Rebuild indexes after
```

### B. RTO/RPO Tracking

| Quarter | DR Drill Date | RTO Achieved | RPO Achieved | Issues | Status |
|---------|---------------|--------------|--------------|--------|--------|
| Q1 2024 | 2024-01-15    | 45 min       | 12 hours     | None   | ✓ Pass |
| Q2 2024 | 2024-04-15    | TBD          | TBD          | TBD    | Pending|
| Q3 2024 | 2024-07-15    | TBD          | TBD          | TBD    | Pending|
| Q4 2024 | 2024-10-15    | TBD          | TBD          | TBD    | Pending|

### C. Backup Retention Policy

| Backup Type | Retention Period | Storage Location |
|-------------|------------------|------------------|
| Daily       | 30 days          | Local + S3       |
| Weekly      | 90 days          | S3               |
| Monthly     | 1 year           | S3 (Glacier)     |
| Yearly      | 7 years          | S3 (Deep Archive)|

---

## Document Control

| Version | Date       | Author          | Changes                    |
|---------|------------|-----------------|----------------------------|
| 1.0     | 2024-10-31 | Database Admin  | Initial version            |

**Last Reviewed:** 2024-10-31
**Next Review:** 2025-01-31
**Owner:** Database Administrator
