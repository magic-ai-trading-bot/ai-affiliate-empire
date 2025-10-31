

# RTO/RPO Procedures and Monitoring

## Overview

This document defines the Recovery Time Objective (RTO) and Recovery Point Objective (RPO) for the AI Affiliate Empire database, along with monitoring procedures to ensure these targets are consistently met.

## Definitions

### Recovery Time Objective (RTO)
**Target: < 1 hour**

The maximum acceptable time to restore database service after a disaster occurs.

**Components:**
- Detection time: 5 minutes
- Decision time: 5 minutes
- Recovery execution: 45 minutes
- Validation: 5 minutes

### Recovery Point Objective (RPO)
**Target: < 1 day (24 hours)**

The maximum acceptable amount of data loss measured in time from the last successful backup.

**Implementation:**
- Daily automated backups at 2:00 AM UTC
- Continuous transaction log archiving (optional)
- Cross-region backup replication (production only)

---

## RTO Procedures

### RTO Achievement Strategy

#### 1. Automated Monitoring (5 minutes)
**Purpose:** Detect failures immediately

**Implementation:**
```bash
# Health check endpoint
curl https://api.aiaffiliateempire.com/health

# Database connectivity check
psql -d "$DATABASE_URL" -c "SELECT 1;"

# Application response time monitoring
curl -w "@curl-format.txt" -o /dev/null -s https://api.aiaffiliateempire.com/api/products
```

**Alerts:**
- Slack notification
- Discord webhook
- PagerDuty escalation
- SMS to on-call DBA

**Monitoring Tools:**
- Datadog Database Monitoring
- CloudWatch Alarms
- Fly.io Health Checks
- Custom monitoring scripts

#### 2. Rapid Decision Making (5 minutes)
**Purpose:** Quickly determine recovery approach

**Decision Tree:**
```
Is database accessible?
├─ NO → Complete Data Loss (Procedure B)
└─ YES → Is data corrupt?
    ├─ YES → Database Corruption (Procedure A)
    └─ NO → Is data missing?
        ├─ YES → Partial Data Loss (Procedure C)
        └─ NO → Performance degradation (investigate)
```

**Decision Checklist:**
- [ ] Identify incident type
- [ ] Assess data loss scope
- [ ] Determine backup recency
- [ ] Check backup availability
- [ ] Estimate recovery time
- [ ] Activate DR team

#### 3. Recovery Execution (45 minutes)
**Purpose:** Restore database service

**Optimized Recovery Path:**

**Phase 1: Preparation (10 min)**
```bash
# Stop application traffic
fly scale count 0 -a ai-affiliate-empire

# Download latest backup
./scripts/disaster-recovery/restore-database.sh -e production -s -d

# Verify backup integrity
./scripts/disaster-recovery/verify-backup-integrity.sh -b [backup_file] -q
```

**Phase 2: Restoration (25 min)**
```bash
# Restore database
./scripts/disaster-recovery/restore-database.sh \
  -e production \
  -b [backup_file] \
  -f

# Parallel operations:
# - Restore data
# - Update DNS (if needed)
# - Prepare application config
```

**Phase 3: Verification (10 min)**
```bash
# Run automated validation
./scripts/disaster-recovery/test-dr-procedure.sh -e production -s -c

# Quick smoke tests
psql -d "$DATABASE_URL" -c "SELECT count(*) FROM \"Product\";"
curl https://api.aiaffiliateempire.com/api/products
```

#### 4. Service Restoration (5 minutes)
**Purpose:** Bring application back online

```bash
# Scale up application
fly scale count 2 -a ai-affiliate-empire

# Monitor application startup
fly logs -a ai-affiliate-empire

# Verify endpoints
curl https://api.aiaffiliateempire.com/health
curl https://api.aiaffiliateempire.com/api/products
curl https://api.aiaffiliateempire.com/api/videos
```

### RTO Optimization Techniques

#### 1. Backup Optimization
- Use uncompressed backups for faster restoration (trade-off: storage)
- Implement incremental backups
- Pre-stage backups in multiple regions
- Use parallel restore operations

#### 2. Infrastructure Readiness
- Keep hot standby database instances
- Pre-provision DR infrastructure
- Automate DNS failover
- Cache application configuration

#### 3. Process Automation
- Automated DR scripts
- One-command restoration
- Automated validation tests
- Self-healing mechanisms

---

## RPO Procedures

### RPO Achievement Strategy

#### 1. Backup Frequency

**Daily Full Backups**
```bash
# Scheduled via cron (2:00 AM UTC)
0 2 * * * /path/to/scripts/disaster-recovery/backup-database.sh \
  -e production \
  -o /var/backups/database \
  -r 30 \
  -s >> /var/log/db-backup.log 2>&1
```

**Benefits:**
- Maximum 24 hours data loss
- Predictable backup windows
- Low overhead on production

**Considerations:**
- Run during low-traffic hours
- Monitor backup completion
- Validate backup integrity

#### 2. Transaction Log Archiving (Optional)

**Continuous Archiving:**
```bash
# PostgreSQL configuration
# In postgresql.conf:
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://ai-affiliate-empire-wal/%f'
```

**Benefits:**
- Point-in-time recovery
- Reduced RPO (minutes instead of hours)
- Continuous data protection

**Restore Command:**
```bash
# Restore to specific point in time
psql -d postgres -c "
SELECT pg_create_restore_point('before_incident');
"
```

#### 3. Replication Strategy

**Streaming Replication:**
```sql
-- Setup read replica
-- In recovery.conf:
standby_mode = 'on'
primary_conninfo = 'host=primary-db port=5432 user=replicator password=xxx'
trigger_file = '/tmp/postgresql.trigger'
```

**Benefits:**
- Near-zero RPO
- Hot standby for failover
- Read query offloading

**Failover:**
```bash
# Promote replica to primary
touch /tmp/postgresql.trigger

# Update application DNS
aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch file://dns.json
```

#### 4. Cross-Region Backup Replication

**S3 Cross-Region Replication:**
```bash
# Configure replication rule
aws s3api put-bucket-replication \
  --bucket ai-affiliate-empire-backups \
  --replication-configuration file://replication-config.json
```

**Config (replication-config.json):**
```json
{
  "Role": "arn:aws:iam::123456789:role/s3-replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": "database-backups/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::ai-affiliate-empire-backups-west",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        }
      }
    }
  ]
}
```

**Benefits:**
- Geographic redundancy
- Region failure protection
- Compliance requirements

---

## Monitoring and Alerting

### Backup Monitoring

#### 1. Backup Completion Monitoring

**CloudWatch Metric:**
```bash
# Publish backup success metric
aws cloudwatch put-metric-data \
  --namespace "AI-Affiliate-Empire" \
  --metric-name "BackupSuccess" \
  --value 1 \
  --timestamp $(date -u +%Y-%m-%dT%H:%M:%S)
```

**Alert Configuration:**
```yaml
# CloudWatch Alarm
AlarmName: DatabaseBackupFailed
MetricName: BackupSuccess
Namespace: AI-Affiliate-Empire
Statistic: Sum
Period: 86400  # 24 hours
EvaluationPeriods: 1
Threshold: 0
ComparisonOperator: LessThanOrEqualToThreshold
AlarmActions:
  - arn:aws:sns:us-east-1:123456789:database-alerts
```

#### 2. Backup Age Monitoring

**Check Script:**
```bash
#!/bin/bash
# Check backup age

LATEST_BACKUP=$(ls -t /var/backups/database/backup_production_*.sql* | head -1)
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))

if [ $BACKUP_AGE -gt 24 ]; then
  echo "WARNING: Latest backup is ${BACKUP_AGE} hours old"
  # Send alert
  curl -X POST "$DISCORD_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"⚠️ Database backup is ${BACKUP_AGE} hours old (RPO at risk)\"}"
  exit 1
fi
```

**Cron Schedule:**
```bash
# Check every 4 hours
0 */4 * * * /path/to/check-backup-age.sh
```

#### 3. Backup Integrity Monitoring

**Daily Verification:**
```bash
# Verify latest backup
0 3 * * * /path/to/scripts/disaster-recovery/verify-backup-integrity.sh \
  -b /var/backups/database/backup_production_$(date +\%Y\%m\%d)*.sql.gz \
  -q || echo "Backup verification failed" | mail -s "ALERT: Backup Integrity" dba@company.com
```

**Metrics to Track:**
- Backup file size
- Checksum validation
- Compression ratio
- Table count
- Record counts

#### 4. Storage Capacity Monitoring

**Disk Space Check:**
```bash
#!/bin/bash
# Monitor backup storage

USAGE=$(df -h /var/backups | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $USAGE -gt 80 ]; then
  echo "WARNING: Backup storage at ${USAGE}% capacity"
  # Trigger cleanup
  /path/to/scripts/disaster-recovery/backup-database.sh -r 15
fi
```

**S3 Storage Monitoring:**
```bash
# Check S3 bucket size
aws s3api list-objects-v2 \
  --bucket ai-affiliate-empire-backups \
  --prefix database-backups/ \
  --query 'sum(Contents[].Size)' \
  --output text
```

### RTO/RPO Dashboard

#### Key Metrics

**RTO Metrics:**
1. **Detection Time**
   - Average time to detect failure
   - Target: < 5 minutes
   - Measure: Monitoring alert latency

2. **Recovery Time**
   - Time from detection to service restoration
   - Target: < 60 minutes
   - Measure: Incident timestamps

3. **Validation Time**
   - Time to verify recovery success
   - Target: < 5 minutes
   - Measure: Test execution duration

**RPO Metrics:**
1. **Backup Frequency**
   - Hours between backups
   - Target: 24 hours
   - Measure: Backup timestamps

2. **Last Successful Backup**
   - Age of most recent backup
   - Target: < 24 hours
   - Measure: Current time - backup time

3. **Data Loss Window**
   - Potential data loss in recovery
   - Target: < 24 hours
   - Measure: Last backup to failure time

#### Dashboard Implementation

**Grafana Dashboard (example):**
```json
{
  "dashboard": {
    "title": "Database DR Monitoring",
    "panels": [
      {
        "title": "Last Backup Age",
        "type": "stat",
        "targets": [
          {
            "expr": "time() - database_last_backup_timestamp"
          }
        ],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "value": 0, "color": "green" },
            { "value": 72000, "color": "yellow" },
            { "value": 86400, "color": "red" }
          ]
        }
      },
      {
        "title": "Backup Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(database_backup_success_total[7d])"
          }
        ]
      },
      {
        "title": "Average RTO (Last 90 Days)",
        "type": "stat",
        "targets": [
          {
            "expr": "avg_over_time(database_recovery_time_seconds[90d])"
          }
        ]
      }
    ]
  }
}
```

---

## Quarterly DR Drills

### Drill Objectives
1. Validate RTO < 60 minutes
2. Validate RPO < 24 hours
3. Test team readiness
4. Identify process gaps
5. Update documentation

### Drill Scenarios

#### Scenario 1: Database Corruption (Q1)
**Objective:** Test recovery from corrupted database
**Expected RTO:** 45 minutes
**Steps:**
1. Simulate corruption in staging
2. Execute Recovery Procedure A
3. Measure time to recovery
4. Validate data integrity
5. Document findings

#### Scenario 2: Complete Data Loss (Q2)
**Objective:** Test recovery from total database loss
**Expected RTO:** 60 minutes
**Steps:**
1. Drop staging database
2. Execute Recovery Procedure B
3. Restore from S3 backup
4. Measure recovery time
5. Validate completeness

#### Scenario 3: Partial Data Loss (Q3)
**Objective:** Test recovery of specific tables
**Expected RTO:** 30 minutes
**Steps:**
1. Delete specific tables in staging
2. Execute Recovery Procedure C
3. Restore selective data
4. Verify data consistency
5. Document process

#### Scenario 4: Region Failure (Q4)
**Objective:** Test cross-region failover
**Expected RTO:** 60 minutes
**Steps:**
1. Simulate primary region failure
2. Execute Recovery Procedure D
3. Failover to backup region
4. Measure total RTO
5. Test application functionality

### Drill Checklist

**Pre-Drill (1 week before):**
- [ ] Schedule drill date/time
- [ ] Notify all participants
- [ ] Prepare test environment
- [ ] Review runbook procedures
- [ ] Set up monitoring/metrics
- [ ] Prepare incident response tools

**During Drill:**
- [ ] Start timer at incident declaration
- [ ] Execute recovery procedure step-by-step
- [ ] Document each step duration
- [ ] Record issues encountered
- [ ] Capture metrics continuously
- [ ] Take screenshots/logs

**Post-Drill (within 1 week):**
- [ ] Calculate actual RTO achieved
- [ ] Analyze RPO validation results
- [ ] Document lessons learned
- [ ] Update runbook if needed
- [ ] Address identified gaps
- [ ] Schedule follow-up actions
- [ ] Report to stakeholders
- [ ] Plan next drill

### Success Criteria

**Must Have:**
- ✓ RTO < 60 minutes
- ✓ RPO < 24 hours validated
- ✓ Zero data loss detected
- ✓ All validation checks passed
- ✓ Application fully functional
- ✓ No manual intervention required

**Nice to Have:**
- ✓ RTO < 45 minutes
- ✓ Automated recovery
- ✓ Team executed confidently
- ✓ Clear documentation
- ✓ Process improvements identified

---

## Continuous Improvement

### Monthly Review Process

**Review Checklist:**
1. **Backup Performance**
   - Average backup duration
   - Backup failure rate
   - Storage consumption trends
   - Compression efficiency

2. **RTO/RPO Metrics**
   - Actual vs target RTO
   - Backup freshness
   - Alert response time
   - Recovery success rate

3. **Process Optimization**
   - Script performance
   - Automation opportunities
   - Documentation accuracy
   - Team readiness

4. **Infrastructure Changes**
   - Database size growth
   - Performance impacts
   - Capacity planning
   - Cost optimization

### Improvement Actions

**Quarterly Goals:**
- Reduce RTO by 10%
- Improve backup completion rate to 99.9%
- Automate 90% of recovery steps
- Achieve < 5 min detection time
- Maintain < 24 hour RPO

**Annual Goals:**
- Implement continuous archiving (RPO < 1 hour)
- Deploy hot standby replicas
- Achieve zero-touch recovery
- Complete 4 successful DR drills
- Document all procedures

---

## Compliance and Reporting

### Monthly Report Template

```
Database DR Report - [Month Year]

RTO/RPO Status:
- Target RTO: < 60 minutes
- Target RPO: < 24 hours
- RTO Achievement: [X]% of drills
- RPO Achievement: [X]% of backups within target

Backup Statistics:
- Total Backups: [X]
- Successful Backups: [X] ([X]%)
- Failed Backups: [X]
- Average Backup Size: [X] GB
- Average Backup Duration: [X] minutes

Incidents:
- Total Incidents: [X]
- Actual RTO Achieved: [X] minutes
- Data Loss: [X] hours
- Root Cause: [Description]
- Corrective Actions: [List]

DR Drills:
- Drills Conducted: [X]
- Drills Passed: [X]
- Issues Identified: [X]
- Improvements Made: [X]

Next Month Actions:
1. [Action item 1]
2. [Action item 2]
3. [Action item 3]
```

---

## Document Control

| Version | Date       | Author          | Changes                          |
|---------|------------|-----------------|----------------------------------|
| 1.0     | 2024-10-31 | Database Admin  | Initial RTO/RPO procedures       |

**Last Reviewed:** 2024-10-31
**Next Review:** 2025-01-31
**Owner:** Database Administrator
