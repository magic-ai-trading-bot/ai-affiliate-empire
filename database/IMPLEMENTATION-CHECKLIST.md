# Database Optimization Implementation Checklist

Quick reference checklist for deploying database optimizations to production.

## Pre-Deployment Verification

- [ ] Database backup created manually (safety net)
- [ ] All scripts reviewed and understood
- [ ] Maintenance window scheduled (if needed)
- [ ] Team notified of deployment
- [ ] Rollback plan documented

## Phase 1: Index Optimization (No Downtime)

**Time Required**: 5-10 minutes

- [ ] Connect to database
  ```bash
  psql $DATABASE_URL
  ```

- [ ] Run index optimization script
  ```bash
  psql $DATABASE_URL -f database/optimize-indexes.sql
  ```

- [ ] Verify indexes created
  ```sql
  \di+ Product*
  \di+ Video*
  \di+ Publication*
  ```

- [ ] Check for errors in script output
- [ ] Run ANALYZE to update statistics
  ```sql
  ANALYZE;
  ```

**Rollback**: Drop new indexes if issues occur
```sql
-- List new indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
-- Drop specific index: DROP INDEX idx_name;
```

---

## Phase 2: PgBouncer Deployment

**Time Required**: 10-15 minutes

### 2.1 Start PgBouncer

- [ ] Review PgBouncer configuration
  ```bash
  cat database/pgbouncer.ini
  ```

- [ ] Create userlist.txt (if not exists)
  ```bash
  echo '"user" "password_md5_hash"' > /etc/pgbouncer/userlist.txt
  ```

- [ ] Start PgBouncer via Docker
  ```bash
  docker-compose -f database/docker-compose.pgbouncer.yml up -d
  ```

- [ ] Verify PgBouncer is running
  ```bash
  docker ps | grep pgbouncer
  docker logs ai-affiliate-pgbouncer
  ```

- [ ] Test connection to PgBouncer
  ```bash
  psql postgresql://user:password@localhost:6432/ai_affiliate_empire
  ```

### 2.2 Update Application

- [ ] Backup current .env
  ```bash
  cp .env .env.backup
  ```

- [ ] Update DATABASE_URL in .env
  ```bash
  DATABASE_URL="postgresql://user:password@localhost:6432/ai_affiliate_empire?pgbouncer=true"
  ```

- [ ] Rebuild application
  ```bash
  npm run build
  ```

- [ ] Restart application
  ```bash
  pm2 restart ai-affiliate-empire
  # OR
  docker-compose restart app
  ```

- [ ] Test application health
  ```bash
  curl http://localhost:3000/health
  ```

- [ ] Monitor PgBouncer stats
  ```bash
  psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW POOLS"
  ```

**Rollback**: Revert .env and restart app
```bash
cp .env.backup .env
pm2 restart ai-affiliate-empire
```

---

## Phase 3: PostgreSQL Configuration

**Time Required**: 5 minutes + restart time

### 3.1 Apply Configuration

- [ ] Backup current config
  ```bash
  sudo cp /etc/postgresql/14/main/postgresql.conf /etc/postgresql/14/main/postgresql.conf.backup
  ```

- [ ] Copy optimized config
  ```bash
  sudo cp database/postgresql.conf /etc/postgresql/14/main/postgresql.conf
  ```

- [ ] Validate configuration
  ```bash
  sudo -u postgres /usr/lib/postgresql/14/bin/postgres -D /var/lib/postgresql/14/main --config-file=/etc/postgresql/14/main/postgresql.conf -C shared_buffers
  ```

- [ ] Restart PostgreSQL
  ```bash
  sudo systemctl restart postgresql
  # OR
  docker-compose restart postgres
  ```

- [ ] Verify PostgreSQL is running
  ```bash
  sudo systemctl status postgresql
  # OR
  docker ps | grep postgres
  ```

- [ ] Test connection
  ```bash
  psql $DATABASE_URL -c "SELECT version();"
  ```

- [ ] Check applied settings
  ```sql
  SHOW shared_buffers;
  SHOW max_connections;
  SHOW effective_cache_size;
  ```

**Rollback**: Restore backup config and restart
```bash
sudo cp /etc/postgresql/14/main/postgresql.conf.backup /etc/postgresql/14/main/postgresql.conf
sudo systemctl restart postgresql
```

---

## Phase 4: Security Setup

**Time Required**: 5 minutes

- [ ] Review security script
  ```bash
  cat database/security-setup.sql
  ```

- [ ] Apply security policies
  ```bash
  psql $DATABASE_URL -f database/security-setup.sql
  ```

- [ ] Change default passwords
  ```sql
  ALTER ROLE app_user WITH PASSWORD 'STRONG_RANDOM_PASSWORD_HERE';
  ALTER ROLE readonly_user WITH PASSWORD 'ANOTHER_STRONG_PASSWORD';
  ALTER ROLE db_admin WITH PASSWORD 'ADMIN_STRONG_PASSWORD';
  ALTER ROLE monitoring_user WITH PASSWORD 'MONITORING_PASSWORD';
  ```

- [ ] Verify roles created
  ```sql
  \du
  ```

- [ ] Test app_user permissions
  ```bash
  psql postgresql://app_user:password@localhost:5432/ai_affiliate_empire -c "SELECT COUNT(*) FROM \"Product\";"
  ```

- [ ] Verify audit log table exists
  ```sql
  SELECT COUNT(*) FROM "AuditLog";
  ```

**Rollback**: Revoke roles if needed
```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;
DROP ROLE app_user;
```

---

## Phase 5: Backup System

**Time Required**: 10 minutes

### 5.1 Configure Backup Scripts

- [ ] Create backup directory
  ```bash
  sudo mkdir -p /var/backups/postgresql/{daily,weekly,monthly,wal}
  sudo chown -R postgres:postgres /var/backups/postgresql
  ```

- [ ] Make scripts executable
  ```bash
  chmod +x database/backup.sh database/restore.sh
  ```

- [ ] Update backup.sh with correct paths/credentials
  ```bash
  nano database/backup.sh
  # Update: DB_NAME, DB_USER, BACKUP_DIR, R2_BUCKET, etc.
  ```

- [ ] Test backup script
  ```bash
  ./database/backup.sh
  ```

- [ ] Verify backup created
  ```bash
  ls -lh /var/backups/postgresql/daily/
  ```

### 5.2 Schedule Automated Backups

- [ ] Add to crontab
  ```bash
  crontab -e
  ```

- [ ] Add daily backup job
  ```cron
  0 2 * * * /path/to/database/backup.sh >> /var/log/db-backup.log 2>&1
  ```

- [ ] Add monthly cleanup job
  ```cron
  0 3 1 * * psql $DATABASE_URL -f /path/to/database/cleanup-old-data.sql >> /var/log/db-cleanup.log 2>&1
  ```

- [ ] Verify cron jobs
  ```bash
  crontab -l
  ```

### 5.3 Test Restore (Optional)

- [ ] List available backups
  ```bash
  ./database/restore.sh --list
  ```

- [ ] Test restore to different database (safe)
  ```bash
  createdb test_restore
  ./database/restore.sh --file /var/backups/postgresql/daily/latest.sql.gz --dbname test_restore
  ```

**Rollback**: N/A (backups don't affect production)

---

## Phase 6: Monitoring Setup

**Time Required**: 5 minutes

- [ ] Install pg_stat_statements extension
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
  ```

- [ ] Test monitoring queries
  ```bash
  psql $DATABASE_URL -f database/monitoring.sql
  ```

- [ ] Review output for errors
- [ ] Bookmark key monitoring queries
  ```sql
  -- Cache hit ratio
  SELECT * FROM pg_stat_database WHERE datname = 'ai_affiliate_empire';

  -- Slow queries
  SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
  ```

- [ ] (Optional) Schedule monitoring
  ```cron
  */15 * * * * psql $DATABASE_URL -f /path/to/database/monitoring.sql > /var/log/db-health.log 2>&1
  ```

**Rollback**: N/A (monitoring is read-only)

---

## Phase 7: Verification & Testing

**Time Required**: 15-20 minutes

### 7.1 Performance Verification

- [ ] Test product listing query speed
  ```bash
  time psql $DATABASE_URL -c "SELECT * FROM \"Product\" WHERE status = 'ACTIVE' ORDER BY \"overallScore\" DESC LIMIT 10;"
  ```

- [ ] Check cache hit ratio (should be > 99%)
  ```sql
  SELECT
    SUM(heap_blks_hit) * 100.0 / (SUM(heap_blks_hit) + SUM(heap_blks_read)) AS cache_hit_ratio
  FROM pg_statio_user_tables;
  ```

- [ ] Verify index usage
  ```sql
  SELECT indexrelname, idx_scan
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC
  LIMIT 10;
  ```

### 7.2 Application Testing

- [ ] Run health check endpoint
  ```bash
  curl http://localhost:3000/health
  ```

- [ ] Test key API endpoints
  ```bash
  curl http://localhost:3000/api/products
  curl http://localhost:3000/api/analytics/dashboard
  ```

- [ ] Monitor application logs for errors
  ```bash
  pm2 logs ai-affiliate-empire --lines 100
  ```

- [ ] Check for database connection errors
  ```bash
  grep -i "connection" /var/log/app.log
  ```

### 7.3 PgBouncer Verification

- [ ] Check pool statistics
  ```bash
  psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW POOLS"
  ```

- [ ] Verify connection reuse
  ```bash
  psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW STATS"
  ```

- [ ] Monitor for connection errors
  ```bash
  docker logs ai-affiliate-pgbouncer --tail 100
  ```

### 7.4 Security Verification

- [ ] Test role permissions
  ```bash
  # App user should have INSERT
  psql postgresql://app_user:password@localhost:5432/ai_affiliate_empire -c "INSERT INTO \"SystemConfig\" (key, value) VALUES ('test', 'value');"

  # Readonly user should NOT have INSERT
  psql postgresql://readonly_user:password@localhost:5432/ai_affiliate_empire -c "INSERT INTO \"SystemConfig\" (key, value) VALUES ('test', 'value');"
  ```

- [ ] Check audit log
  ```sql
  SELECT * FROM "AuditLog" ORDER BY changed_at DESC LIMIT 10;
  ```

### 7.5 Backup Verification

- [ ] Verify latest backup exists
  ```bash
  ls -lh /var/backups/postgresql/daily/ | tail -5
  ```

- [ ] Check backup file integrity
  ```bash
  gzip -t /var/backups/postgresql/daily/latest.sql.gz && echo "OK" || echo "CORRUPTED"
  ```

- [ ] (Optional) Test restore to staging
  ```bash
  ./database/restore.sh --file /var/backups/postgresql/daily/latest.sql.gz --dbname staging
  ```

---

## Phase 8: Monitoring & Alerts

**Time Required**: Ongoing

### 8.1 Daily Checks

- [ ] Check backup success
  ```bash
  tail -100 /var/log/db-backup.log
  ```

- [ ] Review slow query log
  ```sql
  SELECT query, calls, mean_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100
  ORDER BY mean_exec_time DESC
  LIMIT 20;
  ```

- [ ] Check disk space
  ```bash
  df -h | grep postgresql
  ```

### 8.2 Weekly Reviews

- [ ] Analyze cache hit ratio
  ```sql
  SELECT * FROM pg_stat_database WHERE datname = 'ai_affiliate_empire';
  ```

- [ ] Check for table bloat
  ```sql
  SELECT schemaname, tablename, n_dead_tup
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 1000
  ORDER BY n_dead_tup DESC;
  ```

- [ ] Review index usage
  ```sql
  SELECT indexrelname, idx_scan
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey';
  ```

### 8.3 Monthly Tasks

- [ ] Run cleanup script
  ```bash
  psql $DATABASE_URL -f database/cleanup-old-data.sql
  ```

- [ ] Review audit log
  ```sql
  SELECT * FROM "AuditLogSummary";
  ```

- [ ] Check for unused indexes
  ```sql
  -- Drop unused indexes older than 30 days
  SELECT 'DROP INDEX ' || indexrelname || ';'
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
    AND pg_relation_size(indexrelid) > 1000000;
  ```

---

## Troubleshooting

### Issue: Slow Queries After Optimization

**Diagnosis**:
```sql
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

**Solutions**:
1. Run `ANALYZE` to update statistics
2. Check if new indexes are being used (`EXPLAIN ANALYZE`)
3. Increase `work_mem` for complex queries

### Issue: High Connection Count

**Diagnosis**:
```sql
SELECT COUNT(*), state FROM pg_stat_activity GROUP BY state;
```

**Solutions**:
1. Check PgBouncer is running and configured correctly
2. Restart application to reset connections
3. Kill idle connections

### Issue: Backup Failures

**Diagnosis**:
```bash
tail -100 /var/log/db-backup.log
```

**Solutions**:
1. Check disk space
2. Verify database credentials
3. Check network connectivity to R2

### Issue: PgBouncer Connection Errors

**Diagnosis**:
```bash
docker logs ai-affiliate-pgbouncer
```

**Solutions**:
1. Verify PostgreSQL is running
2. Check userlist.txt has correct credentials
3. Restart PgBouncer: `docker-compose restart pgbouncer`

---

## Success Criteria

All checks below should pass:

- ✅ All indexes created successfully
- ✅ Cache hit ratio > 99%
- ✅ Query response time < 100ms (avg)
- ✅ PgBouncer running and accepting connections
- ✅ Application can connect via PgBouncer
- ✅ No database errors in application logs
- ✅ Backup created and verified
- ✅ Security roles configured correctly
- ✅ Audit logging working
- ✅ Monitoring queries executable

---

## Rollback Plan

If critical issues occur:

1. **Revert Application Connection**:
   ```bash
   cp .env.backup .env
   pm2 restart ai-affiliate-empire
   ```

2. **Stop PgBouncer** (use direct PostgreSQL):
   ```bash
   docker-compose -f database/docker-compose.pgbouncer.yml down
   ```

3. **Restore PostgreSQL Config**:
   ```bash
   sudo cp /etc/postgresql/14/main/postgresql.conf.backup /etc/postgresql/14/main/postgresql.conf
   sudo systemctl restart postgresql
   ```

4. **Drop New Indexes** (if causing issues):
   ```sql
   -- List and drop specific indexes
   DROP INDEX idx_product_status_score_category;
   -- etc.
   ```

5. **Restore Database** (worst case):
   ```bash
   ./database/restore.sh --file /var/backups/postgresql/pre_migration_backup.sql.gz
   ```

---

## Post-Deployment Notes

**Date Deployed**: _____________
**Deployed By**: _____________
**Issues Encountered**: _____________
**Rollbacks Needed**: _____________
**Performance Metrics**: _____________

---

**Status**: Ready for Production Deployment ✅

For detailed documentation, see: `database/README.md`
For troubleshooting, see: `database/README.md#troubleshooting`
For monitoring queries, see: `database/monitoring.sql`
