# Database Optimization & Management

Complete PostgreSQL optimization suite for AI Affiliate Empire production deployment.

## 📋 Overview

This directory contains all database optimization scripts, configuration files, and documentation for production-grade PostgreSQL deployment.

### What's Included

- **Index Optimization**: Missing indexes and performance improvements
- **Backup & Restore**: Automated backup scripts with cloud storage
- **Connection Pooling**: PgBouncer configuration for better concurrency
- **Monitoring**: Performance monitoring and slow query detection
- **Security**: Row-level security, audit logging, encryption
- **Data Retention**: Archiving old analytics data
- **Configuration**: Production-optimized PostgreSQL settings

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Navigate to database directory
cd database

# Apply index optimizations
psql $DATABASE_URL -f optimize-indexes.sql

# Set up security policies
psql $DATABASE_URL -f security-setup.sql

# Configure monitoring
psql $DATABASE_URL -f monitoring.sql
```

### 2. Start PgBouncer (Connection Pooling)

```bash
# Using Docker Compose
docker-compose -f docker-compose.pgbouncer.yml up -d

# Or manually with config
pgbouncer -d database/pgbouncer.ini
```

Update `.env` to use PgBouncer:
```bash
DATABASE_URL="postgresql://user:password@localhost:6432/ai_affiliate_empire?pgbouncer=true"
```

### 3. Set Up Automated Backups

```bash
# Make scripts executable
chmod +x backup.sh restore.sh

# Test backup
./backup.sh

# Schedule daily backups (add to crontab)
crontab -e
# Add: 0 2 * * * /path/to/database/backup.sh >> /var/log/db-backup.log 2>&1
```

### 4. Configure PostgreSQL

```bash
# Copy optimized config
cp database/postgresql.conf /etc/postgresql/14/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
# OR
docker-compose restart postgres
```

## 📁 Files Reference

### SQL Scripts

| File | Purpose | When to Run |
|------|---------|-------------|
| `optimize-indexes.sql` | Add missing indexes | Initial setup, after schema changes |
| `cleanup-old-data.sql` | Archive old analytics | Monthly (automated) |
| `monitoring.sql` | Performance monitoring queries | Daily/weekly health checks |
| `security-setup.sql` | Security policies & audit | Initial setup |

### Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `postgresql.conf` | PostgreSQL settings | `/etc/postgresql/14/main/` or Docker volume |
| `pgbouncer.ini` | Connection pooling | `/etc/pgbouncer/` or Docker volume |
| `docker-compose.pgbouncer.yml` | PgBouncer + PostgreSQL | Project root |

### Scripts

| File | Purpose | Usage |
|------|---------|-------|
| `backup.sh` | Automated backups | `./backup.sh` or cron |
| `restore.sh` | Restore from backup | `./restore.sh --list` |

## 🔧 Configuration Guide

### Index Optimization

**Problem**: Slow queries due to missing indexes

**Solution**:
```bash
psql $DATABASE_URL -f optimize-indexes.sql
```

**Impact**:
- 10-100x faster queries on large tables
- Reduced CPU usage during peak traffic
- Better query planner decisions

**Key Indexes Added**:
- Product: status + score + category (composite)
- Video: product + status + created (composite)
- Analytics: date-range queries (time-series)
- Publication: platform + published date

### Connection Pooling (PgBouncer)

**Problem**: Too many connections, resource exhaustion

**Solution**: PgBouncer in transaction mode

**Settings**:
```ini
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20
reserve_pool_size = 10
```

**Impact**:
- Support 200+ concurrent connections with only 20 DB connections
- Reduced connection overhead (10ms → 1ms)
- Better resource utilization

**Monitoring**:
```bash
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW POOLS"
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW STATS"
```

### Backup Strategy

**Policy**:
- **Daily**: Full backups at 2 AM, retention 7 days
- **Weekly**: Sunday backups, retention 4 weeks
- **Monthly**: 1st of month, retention 12 months
- **Cloud**: All backups uploaded to R2/S3

**Commands**:
```bash
# Manual backup
./backup.sh

# List backups
./restore.sh --list
./restore.sh --cloud

# Restore from local
./restore.sh --file /var/backups/postgresql/daily/backup.sql.gz

# Restore from cloud
./restore.sh --date 2024-01-15 --name daily_db_20240115_020000.sql.gz
```

**Verification**:
```bash
# Backup creates pre-restore snapshot automatically
# Rollback if needed:
./restore.sh --file /var/backups/postgresql/pre_restore_*.sql.gz
```

### Data Retention

**Policy**:
- ProductAnalytics: 90 days (archive older)
- PlatformAnalytics: 90 days (archive older)
- NetworkAnalytics: 180 days (archive older)
- WorkflowLog: 30 days (delete older)
- Failed publications: 7 days (delete older)

**Schedule**:
```bash
# Add to crontab for monthly cleanup
0 3 1 * * psql $DATABASE_URL -f cleanup-old-data.sql >> /var/log/db-cleanup.log 2>&1
```

**Manual Cleanup**:
```bash
psql $DATABASE_URL -f cleanup-old-data.sql
```

## 📊 Monitoring

### Health Check Queries

**Cache Hit Ratio** (should be > 99%):
```sql
SELECT * FROM pg_stat_database WHERE datname = 'ai_affiliate_empire';
```

**Slow Queries** (top 20):
```sql
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;
```

**Table Bloat** (dead tuples):
```sql
SELECT schemaname, tablename, n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

**Active Connections**:
```sql
SELECT state, COUNT(*) FROM pg_stat_activity GROUP BY state;
```

### Automated Monitoring

Run monitoring queries on schedule:
```bash
# Add to crontab
*/15 * * * * psql $DATABASE_URL -f monitoring.sql > /var/log/db-health.log 2>&1
```

### Metrics to Track

- **Query Performance**: Mean execution time < 100ms
- **Cache Hit Ratio**: > 99%
- **Connection Pool**: Usage < 80%
- **Disk Space**: Growth rate and capacity
- **Replication Lag**: < 10 seconds (if using replicas)
- **Dead Tuples**: < 10% per table

## 🔒 Security

### User Roles

| Role | Purpose | Permissions |
|------|---------|-------------|
| `app_user` | NestJS application | SELECT, INSERT, UPDATE, DELETE |
| `readonly_user` | Analytics/reporting | SELECT only |
| `db_admin` | Database management | ALL |
| `monitoring_user` | Health checks | pg_monitor |

### Change Default Passwords

```sql
ALTER ROLE app_user WITH PASSWORD 'strong_random_password_here';
ALTER ROLE readonly_user WITH PASSWORD 'another_strong_password';
ALTER ROLE db_admin WITH PASSWORD 'admin_strong_password';
```

### Audit Logging

Tracks all changes to:
- AffiliateNetwork (API keys, commission rates)
- Product (pricing, status)
- SystemConfig (settings)
- ProductAnalytics (revenue)

**View Audit Log**:
```sql
SELECT * FROM "AuditLog" ORDER BY changed_at DESC LIMIT 100;
```

**Sensitive Data Access**:
```sql
SELECT * FROM "SensitiveDataAccess";
```

### Encryption

**Column-level encryption**:
```sql
-- Encrypt
SELECT encrypt_sensitive_data('secret_api_key', 'encryption_password');

-- Decrypt
SELECT decrypt_sensitive_data('encrypted_value', 'encryption_password');
```

## 🎯 Performance Optimization Checklist

- [x] Indexes created on frequently queried columns
- [x] Composite indexes for complex queries
- [x] Partial indexes for filtered queries
- [x] PgBouncer connection pooling configured
- [x] PostgreSQL tuned for 8GB RAM, 4-core CPU
- [x] Autovacuum optimized for write-heavy workload
- [x] Slow query logging enabled (> 500ms)
- [x] pg_stat_statements extension enabled
- [x] WAL archiving configured for PITR
- [x] Automated backups with cloud storage
- [x] Data retention policies implemented
- [x] Monitoring queries documented
- [x] Security policies and audit logging

## 🚨 Troubleshooting

### Slow Queries

**Symptom**: Queries taking > 1 second

**Diagnosis**:
```sql
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

**Solutions**:
1. Add missing indexes (check `monitoring.sql` section 4)
2. Increase `work_mem` for complex sorts/joins
3. Run `VACUUM ANALYZE` on bloated tables
4. Check for N+1 queries in application code

### High Connection Count

**Symptom**: Max connections reached

**Diagnosis**:
```sql
SELECT COUNT(*), state FROM pg_stat_activity GROUP BY state;
```

**Solutions**:
1. Use PgBouncer connection pooling
2. Fix connection leaks in application
3. Increase `max_connections` (not recommended without pooling)
4. Kill idle connections:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes';
```

### Disk Space Issues

**Symptom**: Running out of disk space

**Diagnosis**:
```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT * FROM pg_stat_user_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions**:
1. Run cleanup script: `psql $DATABASE_URL -f cleanup-old-data.sql`
2. Archive old analytics to cold storage
3. Run `VACUUM FULL` during maintenance window
4. Increase disk capacity

### Replication Lag

**Symptom**: Replica falling behind master

**Diagnosis**:
```sql
SELECT * FROM pg_stat_replication;
```

**Solutions**:
1. Increase `max_wal_senders` and `wal_keep_size`
2. Check network bandwidth between master/replica
3. Tune replica's `max_parallel_workers`
4. Consider switching to synchronous replication

## 📈 Scaling Recommendations

### Current Setup (Phase 1)
- Single PostgreSQL instance
- PgBouncer connection pooling
- 8GB RAM, 4 CPU cores
- Daily backups with 7-day retention

### Phase 2 (> 10K requests/min)
- Add read replica for analytics queries
- Separate database for analytics (reporting)
- Increase to 16GB RAM, 8 CPU cores
- Implement table partitioning for analytics tables

### Phase 3 (> 100K requests/min)
- PostgreSQL cluster with Patroni (HA)
- Multiple read replicas (load balancing)
- Connection pooling with PgBouncer/PgPool
- Time-series database (TimescaleDB) for analytics
- Data warehouse (Snowflake/BigQuery) for long-term analytics

## 🔗 Additional Resources

- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [Backup & Recovery](https://www.postgresql.org/docs/current/backup.html)
- [Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## 📞 Support

For database-related issues:
1. Check monitoring queries for health status
2. Review logs: `/var/log/postgresql/` or `docker logs postgres`
3. Run EXPLAIN ANALYZE on slow queries
4. Consult DBA team or PostgreSQL documentation

---

**Last Updated**: 2024-01-15
**PostgreSQL Version**: 14+
**Maintained By**: Database Operations Team
