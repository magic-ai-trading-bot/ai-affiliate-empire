# Database Issues Runbook

**Last Updated**: 2025-10-31
**Owner**: Database/SRE Team
**Review Cycle**: Quarterly

## Overview

Procedures for diagnosing and resolving PostgreSQL database issues in AI Affiliate Empire production environment.

---

## Quick Reference

| Issue | Symptoms | Quick Fix | Detailed Section |
|-------|----------|-----------|------------------|
| Connection Pool Exhausted | "Too many connections" errors | Kill idle connections | [Section 1](#1-connection-pool-exhausted) |
| Slow Queries | High response times | Identify and optimize | [Section 2](#2-slow-queries-identification) |
| Backup/Restore | Data recovery needed | Restore from backup | [Section 3](#3-database-backuprestore) |
| Migration Rollback | Failed migration | Rollback migration | [Section 4](#4-migration-rollback) |
| Data Corruption | Inconsistent data | Verify and repair | [Section 5](#5-data-corruption-recovery) |
| Performance Degradation | Gradual slowdown | Vacuum, reindex, analyze | [Section 6](#6-performance-degradation) |

---

## 1. Connection Pool Exhausted

### Symptoms
- Error: `FATAL: too many connections`
- Error: `Connection pool timeout`
- Application cannot acquire database connections
- High connection count in monitoring

### Diagnosis

```bash
# Connect to database
flyctl postgres connect --app ai-affiliate-empire-db

# Check current connections
SELECT count(*) as connection_count FROM pg_stat_activity;

# Check connection limit
SHOW max_connections;

# See connection breakdown by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

# Identify long-running idle connections
SELECT pid, usename, application_name, state, state_change, query
FROM pg_stat_activity
WHERE state = 'idle'
ORDER BY state_change;

# Check connection pool settings in application
flyctl ssh console --app ai-affiliate-empire
cat /app/.env | grep DATABASE
```

### Resolution

#### Option 1: Kill Idle Connections (Immediate)

```bash
# Kill idle connections older than 10 minutes
flyctl postgres connect --app ai-affiliate-empire-db

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < current_timestamp - INTERVAL '10 minutes'
AND pid != pg_backend_pid();

# Verify connection count reduced
SELECT count(*) FROM pg_stat_activity;
```

#### Option 2: Kill All Non-Essential Connections

```bash
# Terminate all connections except yours and system connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid != pg_backend_pid()
AND usename != 'postgres'
AND application_name != 'Fly Proxy';

# Restart application to force clean reconnection
flyctl apps restart ai-affiliate-empire
```

#### Option 3: Increase Connection Limit (Long-term)

```bash
# Check current limit
flyctl postgres connect --app ai-affiliate-empire-db
SHOW max_connections;
# Default: 100

# For Fly.io, scale to larger instance for more connections
flyctl scale vm shared-cpu-2x --app ai-affiliate-empire-db

# Or upgrade to dedicated CPU
flyctl scale vm dedicated-cpu-1x --app ai-affiliate-empire-db

# Update application connection pool settings
# In .env or secrets:
# DATABASE_POOL_MIN=2
# DATABASE_POOL_MAX=10  (should be less than max_connections/num_instances)
```

### Prevention

1. **Configure Connection Pooling Properly**
   ```typescript
   // In prisma/schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     // Connection pool settings
     connectionLimit = 10
   }
   ```

2. **Implement Connection Timeout**
   ```bash
   # Set in DATABASE_URL
   postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10
   ```

3. **Monitor Connection Usage**
   - Set alert: `pg_stat_activity_count > 80`
   - Weekly review of connection patterns

4. **Use PgBouncer** (for high-scale scenarios)
   ```bash
   # Deploy PgBouncer as intermediary
   # See: https://www.pgbouncer.org/
   ```

---

## 2. Slow Queries Identification

### Symptoms
- API response times > 3 seconds
- Database CPU > 80%
- Timeout errors in application logs
- Users reporting slow loading

### Diagnosis

#### Check Current Active Queries

```bash
flyctl postgres connect --app ai-affiliate-empire-db

-- View currently running queries
SELECT
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE state = 'active'
AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Kill a specific slow query (if needed)
SELECT pg_terminate_backend(12345);  -- Replace with actual PID
```

#### Identify Slow Queries (Historical)

```bash
# Enable pg_stat_statements if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries by average execution time
SELECT
  query,
  calls,
  total_exec_time / 1000 as total_time_sec,
  mean_exec_time / 1000 as avg_time_sec,
  max_exec_time / 1000 as max_time_sec
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Top 10 queries by total time (impact)
SELECT
  query,
  calls,
  total_exec_time / 1000 as total_time_sec,
  mean_exec_time / 1000 as avg_time_sec
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 10;
```

#### Analyze Specific Query

```bash
-- Get execution plan
EXPLAIN ANALYZE
SELECT * FROM products WHERE category = 'electronics' ORDER BY created_at DESC LIMIT 10;

-- Look for:
-- - Seq Scan (table scan) - BAD, needs index
-- - Index Scan - GOOD
-- - Cost values - higher is slower
-- - Actual time vs Estimated time
```

### Resolution

#### Add Missing Indexes

```bash
-- Check existing indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Create index for slow queries
-- Example: If category filtering is slow
CREATE INDEX CONCURRENTLY idx_products_category ON products(category);

-- Composite index for multiple columns
CREATE INDEX CONCURRENTLY idx_products_category_created
ON products(category, created_at DESC);

-- Verify index is being used
EXPLAIN ANALYZE
SELECT * FROM products WHERE category = 'electronics' ORDER BY created_at DESC LIMIT 10;
```

#### Optimize Query

```sql
-- Bad: N+1 query pattern
SELECT * FROM products WHERE id IN (1,2,3,...); -- Multiple queries

-- Good: Single query with JOIN
SELECT p.*, c.*
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.id IN (1,2,3,...);

-- Use pagination instead of OFFSET (slow)
-- Bad:
SELECT * FROM products ORDER BY id LIMIT 10 OFFSET 1000000;

-- Good: Keyset pagination
SELECT * FROM products WHERE id > 1000000 ORDER BY id LIMIT 10;
```

#### Update Statistics

```bash
-- Analyze tables to update query planner statistics
ANALYZE products;
ANALYZE categories;

-- Or analyze all tables
ANALYZE;
```

### Monitoring Setup

```bash
# Create alert for slow queries
# In monitoring/prometheus/alerts.yml

- alert: SlowDatabaseQueries
  expr: pg_stat_statements_mean_exec_time_seconds > 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Database queries averaging > 1 second"
    description: "Check pg_stat_statements for slow queries"
```

---

## 3. Database Backup/Restore

### Backup Procedures

#### Automated Backups (Fly.io)

```bash
# Fly.io automatically backs up databases

# List available backups
flyctl postgres backups list --app ai-affiliate-empire-db

# Example output:
# ID    | Created At           | Size
# ------|---------------------|-------
# 12345 | 2025-10-31 10:00:00 | 1.2GB
# 12344 | 2025-10-30 10:00:00 | 1.1GB
```

#### Manual Backup

```bash
# Create immediate backup
flyctl postgres backup create --app ai-affiliate-empire-db

# Download backup for local storage
# Option 1: Using pg_dump
flyctl postgres connect --app ai-affiliate-empire-db

# On local machine:
pg_dump "postgresql://user:pass@host:5432/db" > backup-$(date +%Y%m%d-%H%M%S).sql

# Compress backup
gzip backup-*.sql

# Option 2: Using Fly.io tools
flyctl ssh console --app ai-affiliate-empire-db
pg_dump -U postgres -d affiliate_empire > /tmp/backup.sql
exit

flyctl ssh sftp get /tmp/backup.sql backup.sql --app ai-affiliate-empire-db
```

#### Verify Backup Integrity

```bash
# Test restore in development/staging first
psql "postgresql://localhost:5432/test_restore" < backup.sql

# Verify data
psql postgresql://localhost:5432/test_restore
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM analytics_events;
\dt  -- List all tables
```

### Restore Procedures

#### Full Database Restore

```bash
# WARNING: This will overwrite all data!

# 1. Stop application to prevent writes
flyctl scale count 0 --app ai-affiliate-empire

# 2. Restore from Fly.io backup
flyctl postgres backup restore <backup-id> --app ai-affiliate-empire-db

# 3. Verify restoration
flyctl postgres connect --app ai-affiliate-empire-db
SELECT count(*) FROM products;
SELECT count(*) FROM analytics_events;
SELECT max(created_at) FROM products;  -- Check data freshness

# 4. Restart application
flyctl scale count 2 --app ai-affiliate-empire

# 5. Run health checks
curl https://ai-affiliate-empire.fly.dev/health/ready
npm run test:smoke:production
```

#### Restore from Manual Backup

```bash
# 1. Upload backup to database instance
flyctl ssh sftp put backup.sql /tmp/backup.sql --app ai-affiliate-empire-db

# 2. Restore database
flyctl ssh console --app ai-affiliate-empire-db
psql -U postgres -d affiliate_empire < /tmp/backup.sql

# 3. Verify and restart application
```

#### Point-in-Time Recovery (PITR)

```bash
# Restore to specific timestamp (if supported by provider)
flyctl postgres backup restore \
  --app ai-affiliate-empire-db \
  --backup-id <backup-id> \
  --recovery-target-time "2025-10-31 14:30:00"

# Verify restored data matches expected timestamp
flyctl postgres connect --app ai-affiliate-empire-db
SELECT max(created_at) FROM analytics_events;
```

### Backup Strategy Recommendations

1. **Retention Policy**
   - Hourly backups: Keep 24 hours
   - Daily backups: Keep 30 days
   - Weekly backups: Keep 12 weeks
   - Monthly backups: Keep 12 months

2. **Backup Verification**
   - Weekly automated restore tests in staging
   - Monthly manual verification of backup integrity

3. **Off-site Backups**
   ```bash
   # Sync backups to S3 for disaster recovery
   aws s3 sync /backups/ s3://ai-affiliate-empire-backups/postgres/
   ```

---

## 4. Migration Rollback

### Symptoms
- Application fails after migration
- Schema errors in logs
- Data inconsistencies
- Foreign key constraint violations

### Diagnosis

```bash
# Check migration status
flyctl ssh console --app ai-affiliate-empire
npx prisma migrate status

# Example problematic output:
# Following migrations have failed:
# 20251031_add_analytics_table

# Check Prisma migration table
flyctl postgres connect --app ai-affiliate-empire-db
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;

# Check for partial migrations (started_at set, finished_at NULL)
SELECT migration_name, started_at, finished_at, logs
FROM "_prisma_migrations"
WHERE finished_at IS NULL;
```

### Resolution

#### Option 1: Rollback Failed Migration

```bash
# Mark migration as rolled back
flyctl ssh console --app ai-affiliate-empire
npx prisma migrate resolve --rolled-back 20251031_add_analytics_table

# Manually revert schema changes if needed
flyctl postgres connect --app ai-affiliate-empire-db

-- Drop table created by failed migration
DROP TABLE IF EXISTS analytics_new CASCADE;

-- Revert column changes
ALTER TABLE products DROP COLUMN IF EXISTS new_column;
```

#### Option 2: Deploy Previous Application Version

```bash
# Rollback application (will use previous schema)
./scripts/rollback.sh production

# Verify application works with old schema
curl https://ai-affiliate-empire.fly.dev/health/ready

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20251031_add_analytics_table
```

#### Option 3: Restore Database from Pre-Migration Backup

```bash
# Find backup before migration
flyctl postgres backups list --app ai-affiliate-empire-db

# Restore from backup before migration
flyctl postgres backup restore <backup-id> --app ai-affiliate-empire-db

# Rollback application
./scripts/rollback.sh production

# Verify system health
npm run test:smoke:production
```

### Creating Safe Migrations

**Best Practices:**

1. **Make Migrations Reversible**
   ```sql
   -- Always include both up and down migrations
   -- Create table
   CREATE TABLE new_table (...);

   -- Include rollback
   -- DROP TABLE new_table;
   ```

2. **Use Transactions**
   ```typescript
   // In migration file
   BEGIN;
   -- Migration statements
   COMMIT;
   -- If error occurs, automatic ROLLBACK
   ```

3. **Test in Staging First**
   ```bash
   # Always test migrations in staging
   flyctl deploy --config deploy/fly.staging.toml
   # Verify functionality
   # Then deploy to production
   ```

4. **Avoid Destructive Changes in Single Step**
   ```sql
   -- Bad: Dropping column immediately
   ALTER TABLE products DROP COLUMN old_column;

   -- Good: Multi-step approach
   -- Step 1: Make column nullable
   ALTER TABLE products ALTER COLUMN old_column DROP NOT NULL;
   -- Deploy code that doesn't use column
   -- Step 2: Drop column in next migration
   ALTER TABLE products DROP COLUMN old_column;
   ```

---

## 5. Data Corruption Recovery

### Symptoms
- Inconsistent data across related tables
- Foreign key constraint violations
- NULL values in NOT NULL columns
- Duplicate primary keys
- Encoding errors

### Diagnosis

```bash
flyctl postgres connect --app ai-affiliate-empire-db

-- Check for orphaned records (products without categories)
SELECT COUNT(*)
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE c.id IS NULL AND p.category_id IS NOT NULL;

-- Check for NULL violations
SELECT COUNT(*)
FROM products
WHERE name IS NULL OR price IS NULL;

-- Check for duplicates
SELECT id, COUNT(*)
FROM products
GROUP BY id
HAVING COUNT(*) > 1;

-- Check foreign key violations
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY';

-- Verify constraint
ALTER TABLE products VALIDATE CONSTRAINT fk_products_category;
```

### Resolution

#### Fix Orphaned Records

```sql
-- Option 1: Delete orphaned records
DELETE FROM products
WHERE category_id NOT IN (SELECT id FROM categories);

-- Option 2: Assign to default category
UPDATE products
SET category_id = (SELECT id FROM categories WHERE name = 'Uncategorized' LIMIT 1)
WHERE category_id NOT IN (SELECT id FROM categories);
```

#### Fix NULL Values

```sql
-- Identify rows with NULLs
SELECT id, name, price
FROM products
WHERE name IS NULL OR price IS NULL;

-- Fix with default values
UPDATE products
SET name = 'Unknown Product'
WHERE name IS NULL;

UPDATE products
SET price = 0.00
WHERE price IS NULL;
```

#### Fix Duplicates

```sql
-- Find duplicates
SELECT id, COUNT(*) as count
FROM products
GROUP BY id
HAVING COUNT(*) > 1;

-- Keep only the first occurrence
DELETE FROM products a
USING products b
WHERE a.id = b.id
AND a.ctid < b.ctid;  -- ctid is internal row identifier
```

#### Repair Corrupt Indexes

```bash
-- Check for corrupt indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Rebuild all indexes
REINDEX DATABASE affiliate_empire;

-- Or rebuild specific index
REINDEX INDEX idx_products_category;

-- Rebuild table
REINDEX TABLE products;
```

### Prevention

1. **Use Transactions for Multi-Table Operations**
   ```typescript
   await prisma.$transaction([
     prisma.product.create({ data: productData }),
     prisma.analyticsEvent.create({ data: eventData })
   ]);
   ```

2. **Add Database Constraints**
   ```sql
   ALTER TABLE products
   ADD CONSTRAINT fk_products_category
   FOREIGN KEY (category_id) REFERENCES categories(id)
   ON DELETE CASCADE;

   ALTER TABLE products
   ALTER COLUMN name SET NOT NULL;
   ```

3. **Regular Integrity Checks**
   ```bash
   # Weekly automated check
   flyctl postgres connect --app ai-affiliate-empire-db
   SELECT * FROM pg_catalog.pg_check_integrity();
   ```

---

## 6. Performance Degradation

### Symptoms
- Gradual slowdown over days/weeks
- Queries that were fast are now slow
- Increased disk I/O
- Higher CPU usage without load increase
- Table bloat

### Diagnosis

```bash
flyctl postgres connect --app ai-affiliate-empire-db

-- Check database size
SELECT pg_size_pretty(pg_database_size('affiliate_empire'));

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tuple_percent
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Check last vacuum/analyze
SELECT
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY last_vacuum;
```

### Resolution

#### Run VACUUM

```sql
-- Reclaim space from dead tuples (non-blocking)
VACUUM ANALYZE products;
VACUUM ANALYZE analytics_events;

-- For severely bloated tables, use VACUUM FULL (requires table lock)
-- WARNING: This locks the table!
-- Schedule during maintenance window
VACUUM FULL products;

-- Check improvement
SELECT pg_size_pretty(pg_total_relation_size('products'));
```

#### Rebuild Indexes

```sql
-- Check index bloat
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC;

-- Rebuild bloated indexes (CONCURRENTLY to avoid locks)
REINDEX INDEX CONCURRENTLY idx_products_category;
REINDEX INDEX CONCURRENTLY idx_analytics_created_at;

-- Or rebuild all indexes for a table
REINDEX TABLE CONCURRENTLY products;
```

#### Update Statistics

```sql
-- Update query planner statistics
ANALYZE products;
ANALYZE analytics_events;

-- Or all tables
ANALYZE;

-- For heavily modified tables, increase statistics target
ALTER TABLE products ALTER COLUMN category SET STATISTICS 1000;
ANALYZE products;
```

#### Archive Old Data

```sql
-- Identify old data for archival
SELECT COUNT(*)
FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';

-- Archive to separate table
CREATE TABLE analytics_events_archive AS
SELECT * FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete archived data
DELETE FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space
VACUUM ANALYZE analytics_events;
```

### Automated Maintenance

```sql
-- Check autovacuum settings
SHOW autovacuum;
SHOW autovacuum_vacuum_threshold;
SHOW autovacuum_analyze_threshold;

-- Adjust autovacuum for high-write tables
ALTER TABLE analytics_events SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.01
);

-- Enable aggressive autovacuum
ALTER TABLE products SET (
  autovacuum_vacuum_cost_delay = 0
);
```

### Monitoring Setup

```bash
# Add Prometheus metrics for database health
# Monitor:
# - pg_stat_user_tables_n_dead_tup (dead tuples)
# - pg_database_size_bytes (database size growth)
# - pg_stat_statements_mean_exec_time_seconds (query performance)

# Create alerts in monitoring/prometheus/alerts.yml
- alert: HighDeadTuples
  expr: pg_stat_user_tables_n_dead_tup > 100000
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "Table has high dead tuple count"
    description: "Run VACUUM on {{ $labels.table }}"
```

---

## Emergency Database Procedures

### Complete Database Failure

```bash
# 1. Verify database is truly down
flyctl postgres status --app ai-affiliate-empire-db

# 2. Check Fly.io status page
# https://status.fly.io

# 3. Attempt restart
flyctl postgres restart --app ai-affiliate-empire-db

# 4. If restart fails, restore from latest backup
flyctl postgres backups list --app ai-affiliate-empire-db
flyctl postgres backup restore <latest-backup-id> --app ai-affiliate-empire-db

# 5. If all else fails, provision new database
flyctl postgres create --name ai-affiliate-empire-db-new --region sjc
# Restore backup to new database
# Update application DATABASE_URL
# Switch traffic to new database
```

### Disk Space Full

```bash
# Check disk usage
flyctl ssh console --app ai-affiliate-empire-db
df -h

# Quick space recovery
# 1. Drop temporary tables
DROP TABLE IF EXISTS temp_*;

# 2. Truncate logs
TRUNCATE TABLE pg_stat_statements;

# 3. Remove old backups
# Via Fly.io dashboard

# 4. Archive old data (see Performance Degradation section)

# Long-term: Upgrade disk size
flyctl scale vm dedicated-cpu-2x --app ai-affiliate-empire-db
```

---

## Related Runbooks

- [Incident Response](./incident-response.md) - General incident procedures
- [Deployment Rollback](./deployment-rollback.md) - Application rollback procedures
- [Performance Degradation](./performance-degradation.md) - Application performance issues
- [Backup & Restore](./backup-restore.md) - Comprehensive backup procedures

---

## References

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Prisma Migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Fly.io Postgres: https://fly.io/docs/postgres/
- pg_stat_statements: https://www.postgresql.org/docs/current/pgstatstatements.html

---

**Document Version**: 1.0
**Last Tested**: 2025-10-31
**Next Review**: 2026-01-31
