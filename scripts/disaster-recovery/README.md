# Disaster Recovery Scripts

## Overview

This directory contains production-ready scripts for database backup, restoration, and disaster recovery testing for the AI Affiliate Empire project.

**RTO (Recovery Time Objective):** < 1 hour
**RPO (Recovery Point Objective):** < 1 day (24 hours)

## Scripts

### 1. backup-database.sh
**Purpose:** Create compressed PostgreSQL database backups with metadata

**Usage:**
```bash
./backup-database.sh [OPTIONS]

Options:
  -e, --env ENV       Environment (development|staging|production) [default: development]
  -o, --output DIR    Output directory for backups [default: ./backups]
  -r, --retention N   Keep last N backups [default: 30]
  -s, --s3-upload     Upload backup to S3 (requires AWS CLI configured)
  -n, --no-compress   Skip compression (faster, larger files)
  -h, --help          Show help message
```

**Examples:**
```bash
# Basic backup
./backup-database.sh

# Production backup with S3 upload
./backup-database.sh -e production -o /var/backups/db -r 90 -s

# Staging backup without compression
./backup-database.sh -e staging --no-compress
```

**Features:**
- Automated backup creation with pg_dump
- Gzip compression for storage efficiency
- Metadata generation for validation
- S3 upload support for offsite storage
- Automatic cleanup of old backups
- Comprehensive error handling
- Detailed logging and reporting

**Exit Codes:**
- 0: Success
- 1: Missing dependencies
- 2: Invalid arguments
- 3: Database connection failed
- 4: Backup creation failed
- 5: S3 upload failed

---

### 2. restore-database.sh
**Purpose:** Restore PostgreSQL database from backup with safety checks

**Usage:**
```bash
./restore-database.sh [OPTIONS]

Options:
  -e, --env ENV          Target environment (development|staging|production) [default: development]
  -b, --backup FILE      Backup file path (local or S3 URI)
  -t, --target-db NAME   Target database name [default: from backup metadata]
  -f, --force            Skip confirmation prompt
  -d, --dry-run          Verify backup only, don't restore
  -s, --from-s3          Download latest backup from S3
  --no-verify            Skip backup integrity verification
  -h, --help             Show help message
```

**Examples:**
```bash
# Restore from local backup
./restore-database.sh -b ./backups/backup_production_20241031_120000.sql.gz

# Restore latest backup from S3 (staging)
./restore-database.sh -e staging -s

# Dry run to verify backup
./restore-database.sh -d -b ./backups/latest.sql

# Force restore without confirmation
./restore-database.sh -b s3://bucket/backup.sql.gz -f
```

**Features:**
- Multiple backup sources (local, S3)
- Integrity verification before restore
- Safety backup before restoration
- Confirmation prompts for safety
- Dry-run mode for validation
- Connection termination handling
- Comprehensive validation checks
- Detailed reporting

**Exit Codes:**
- 0: Success
- 1: Missing dependencies
- 2: Invalid arguments
- 3: Backup file not found/invalid
- 4: Database connection failed
- 5: Restore failed
- 6: Verification failed

---

### 3. verify-backup-integrity.sh
**Purpose:** Comprehensive verification of database backup integrity

**Usage:**
```bash
./verify-backup-integrity.sh [OPTIONS]

Options:
  -b, --backup FILE     Backup file to verify (required)
  -d, --detailed        Perform detailed analysis
  -r, --report FILE     Save report to file
  -q, --quiet           Minimal output
  -h, --help            Show help message
```

**Examples:**
```bash
# Basic verification
./verify-backup-integrity.sh -b ./backups/backup_production_20241031.sql.gz

# Detailed analysis with report
./verify-backup-integrity.sh -b ./backups/latest.sql -d -r report.txt

# Quiet mode for automation
./verify-backup-integrity.sh -b s3://bucket/backup.sql.gz -q
```

**Verification Checks:**
1. File existence and readability
2. File size validation
3. File type validation
4. Compression integrity
5. Metadata validation
6. Checksum calculation
7. SQL content validation
8. Schema analysis (detailed mode)
9. Backup age validation

**Features:**
- 9 comprehensive integrity checks
- Checksum generation and validation
- S3 backup support
- Detailed schema analysis
- Age validation against RPO
- Clear pass/fail reporting
- Automated verification scores

**Exit Codes:**
- 0: Backup is valid
- 1: Missing dependencies
- 2: Invalid arguments
- 3: Backup file not found
- 4: Integrity check failed
- 5: Verification failed

---

### 4. test-dr-procedure.sh
**Purpose:** Automated end-to-end DR procedure testing

**Usage:**
```bash
./test-dr-procedure.sh [OPTIONS]

Options:
  -e, --env ENV          Environment to test (development|staging) [default: development]
  -f, --full             Full test including data validation
  -c, --cleanup          Clean up test artifacts after completion
  -s, --skip-backup      Skip backup creation (use existing backup)
  -r, --report FILE      Save detailed report to file
  -h, --help             Show help message
```

**Examples:**
```bash
# Basic DR test
./test-dr-procedure.sh

# Full test with cleanup (staging)
./test-dr-procedure.sh -e staging -f -c

# Generate detailed report
./test-dr-procedure.sh --full --cleanup --report dr-test-report.txt
```

**Test Scenarios:**
1. Backup creation
2. Backup integrity verification
3. Test database creation
4. Database restoration
5. Database connectivity
6. Schema validation
7. Data integrity validation
8. Index validation
9. Constraint validation
10. Performance testing

**Features:**
- Comprehensive end-to-end testing
- RTO/RPO validation
- Automated test execution
- Detailed metrics collection
- Success/failure reporting
- Test artifact management
- Cleanup automation
- Detailed test reports

**Exit Codes:**
- 0: All tests passed
- 1: Test setup failed
- 2: Backup test failed
- 3: Restore test failed
- 4: Validation test failed
- 5: Cleanup failed

---

## Prerequisites

### Required Tools
- PostgreSQL client (psql, pg_dump)
- gzip/gunzip
- bash 4.0+
- curl (for health checks)

### Optional Tools
- AWS CLI (for S3 backup/restore)
- sha256sum or shasum (for checksums)

### Installation
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# AWS CLI (optional)
brew install awscli  # macOS
sudo apt-get install awscli  # Ubuntu
```

### Environment Setup
```bash
# Ensure environment files exist
ls -la .env .env.staging .env.production

# Verify DATABASE_URL is configured
grep DATABASE_URL .env

# Test database connectivity
psql -d "$DATABASE_URL" -c "SELECT version();"
```

---

## Scheduled Operations

### Automated Daily Backups

**Crontab Configuration:**
```bash
# Edit crontab
crontab -e

# Add daily backup job (2:00 AM UTC)
0 2 * * * /path/to/scripts/disaster-recovery/backup-database.sh \
  -e production \
  -o /var/backups/database \
  -r 30 \
  -s >> /var/log/db-backup.log 2>&1

# Add backup verification job (3:00 AM UTC)
0 3 * * * /path/to/scripts/disaster-recovery/verify-backup-integrity.sh \
  -b /var/backups/database/backup_production_$(date +\%Y\%m\%d)*.sql.gz \
  -q >> /var/log/db-verify.log 2>&1
```

**SystemD Timer (alternative):**
```ini
# /etc/systemd/system/database-backup.timer
[Unit]
Description=Daily Database Backup

[Timer]
OnCalendar=daily
OnCalendar=02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/database-backup.service
[Unit]
Description=Database Backup Service

[Service]
Type=oneshot
ExecStart=/path/to/scripts/disaster-recovery/backup-database.sh -e production -o /var/backups/database -r 30 -s
```

Enable timer:
```bash
sudo systemctl enable database-backup.timer
sudo systemctl start database-backup.timer
```

---

## AWS S3 Configuration

### S3 Bucket Setup
```bash
# Create backup bucket
aws s3 mb s3://ai-affiliate-empire-backups

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ai-affiliate-empire-backups \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket ai-affiliate-empire-backups \
  --lifecycle-configuration file://lifecycle-policy.json
```

### Lifecycle Policy (lifecycle-policy.json)
```json
{
  "Rules": [
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Prefix": "database-backups/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

### Cross-Region Replication
```bash
# Enable cross-region replication
aws s3api put-bucket-replication \
  --bucket ai-affiliate-empire-backups \
  --replication-configuration file://replication-config.json
```

### IAM Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::ai-affiliate-empire-backups/*",
        "arn:aws:s3:::ai-affiliate-empire-backups"
      ]
    }
  ]
}
```

---

## Monitoring and Alerts

### CloudWatch Alarms

**Backup Failure Alert:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name DatabaseBackupFailed \
  --alarm-description "Alert when database backup fails" \
  --metric-name BackupSuccess \
  --namespace AI-Affiliate-Empire \
  --statistic Sum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator LessThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:database-alerts
```

**Backup Age Alert:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name BackupTooOld \
  --alarm-description "Alert when backup is older than 25 hours" \
  --metric-name BackupAge \
  --namespace AI-Affiliate-Empire \
  --statistic Maximum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 90000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:database-alerts
```

### Discord Notifications

**Setup:**
```bash
# Add to .env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Test notification
curl -X POST "$DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "✅ Database backup completed successfully"}'
```

**Integration in Scripts:**
Scripts automatically send notifications on success/failure if `DISCORD_WEBHOOK_URL` is configured.

---

## Troubleshooting

### Common Issues

#### Issue: "psql: command not found"
**Solution:**
```bash
# Install PostgreSQL client
brew install postgresql  # macOS
sudo apt-get install postgresql-client  # Ubuntu
```

#### Issue: "Permission denied"
**Solution:**
```bash
# Make scripts executable
chmod +x scripts/disaster-recovery/*.sh
```

#### Issue: "Database connection failed"
**Solution:**
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection manually
psql -d "$DATABASE_URL" -c "SELECT 1;"

# Check firewall/security groups
# Verify credentials
```

#### Issue: "Backup file corrupted"
**Solution:**
```bash
# Verify backup integrity
./verify-backup-integrity.sh -b [backup_file] -d

# Use previous backup
ls -lt ./backups/ | head -5

# Re-run backup
./backup-database.sh -e production
```

#### Issue: "Restore takes too long"
**Solution:**
```bash
# Use uncompressed backup
./backup-database.sh -e production --no-compress

# Disable indexes during restore
# Use parallel restore (if available)
# Check disk I/O performance
```

---

## Best Practices

### Backup Strategy
1. **Daily Full Backups**
   - Schedule during low-traffic hours
   - Verify completion with monitoring
   - Upload to S3 for offsite storage

2. **Retention Policy**
   - Keep 30 days of daily backups
   - Keep 90 days of weekly backups
   - Keep 1 year of monthly backups

3. **Testing**
   - Quarterly DR drills
   - Monthly backup verification
   - Weekly automated tests

### Security
1. **Encryption**
   - Enable S3 bucket encryption
   - Use encrypted connections (SSL/TLS)
   - Secure backup file permissions (600)

2. **Access Control**
   - Limit S3 bucket access (IAM policies)
   - Use least privilege principles
   - Audit access logs regularly

3. **Credentials**
   - Never commit credentials to git
   - Use environment variables
   - Rotate credentials regularly

### Performance
1. **Optimization**
   - Use DIRECT_DATABASE_URL (no connection pooling)
   - Compress backups for storage efficiency
   - Use incremental backups for large databases

2. **Monitoring**
   - Track backup duration trends
   - Monitor storage consumption
   - Alert on anomalies

---

## Documentation

### Primary Documentation
- **DR Runbook:** `/docs/disaster-recovery-runbook.md`
- **RTO/RPO Procedures:** `/docs/rto-rpo-procedures.md`
- **Deployment Guide:** `/docs/deployment-guide.md`
- **Monitoring Guide:** `/docs/monitoring-guide.md`

### Quick Reference
- **RTO Target:** < 1 hour
- **RPO Target:** < 24 hours
- **Backup Schedule:** Daily at 2:00 AM UTC
- **Retention:** 30 days local, 90 days S3
- **Support:** Database Administrator

---

## Change Log

| Version | Date       | Changes                              |
|---------|------------|--------------------------------------|
| 1.0     | 2024-10-31 | Initial release of DR scripts        |

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues or questions:
- **GitHub Issues:** [Create issue](https://github.com/yourusername/ai-affiliate-empire/issues)
- **Email:** dba@company.com
- **Slack:** #database-ops
- **Discord:** #infrastructure

---

**Last Updated:** 2024-10-31
**Maintained By:** Database Administrator
