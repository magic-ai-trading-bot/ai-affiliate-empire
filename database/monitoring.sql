-- ============================================================================
-- PostgreSQL Monitoring Queries
-- AI Affiliate Empire - Database Health & Performance Monitoring
-- ============================================================================
-- Purpose: Monitor database performance, identify bottlenecks, track metrics
-- Usage: Run queries individually or integrate with monitoring tools
-- Tools: Grafana, Datadog, New Relic, or custom dashboard
-- ============================================================================

-- ============================================================================
-- 1. DATABASE SIZE AND GROWTH
-- ============================================================================

-- Overall database size
SELECT
    pg_database.datname as database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size,
    pg_database_size(pg_database.datname) AS size_bytes
FROM pg_database
WHERE datname = current_database();

-- Table sizes (top 20 largest tables)
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size,
    pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Index sizes (top 20 largest indexes)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ============================================================================
-- 2. SLOW QUERIES (Top 20)
-- ============================================================================
-- Requires: pg_stat_statements extension
-- Enable: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Top queries by total time
SELECT
    calls,
    total_exec_time,
    mean_exec_time,
    (total_exec_time / SUM(total_exec_time) OVER ()) * 100 AS pct_total_time,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- Reset pg_stat_statements (run after analyzing)
-- SELECT pg_stat_statements_reset();

-- ============================================================================
-- 3. CACHE HIT RATIO (should be > 99%)
-- ============================================================================

SELECT
    'Cache Hit Ratio' AS metric,
    SUM(heap_blks_hit) AS heap_hits,
    SUM(heap_blks_read) AS heap_reads,
    CASE
        WHEN SUM(heap_blks_hit) + SUM(heap_blks_read) = 0 THEN 0
        ELSE ROUND(SUM(heap_blks_hit) * 100.0 / (SUM(heap_blks_hit) + SUM(heap_blks_read)), 2)
    END AS cache_hit_ratio
FROM pg_statio_user_tables;

-- Per-table cache hit ratio
SELECT
    schemaname,
    tablename,
    heap_blks_hit,
    heap_blks_read,
    CASE
        WHEN heap_blks_hit + heap_blks_read = 0 THEN 0
        ELSE ROUND(heap_blks_hit * 100.0 / (heap_blks_hit + heap_blks_read), 2)
    END AS cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY heap_blks_read DESC
LIMIT 20;

-- ============================================================================
-- 4. INDEX USAGE AND EFFICIENCY
-- ============================================================================

-- Unused indexes (never scanned, safe to drop)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Index hit ratio (should be > 99%)
SELECT
    'Index Hit Ratio' AS metric,
    SUM(idx_blks_hit) AS index_hits,
    SUM(idx_blks_read) AS index_reads,
    CASE
        WHEN SUM(idx_blks_hit) + SUM(idx_blks_read) = 0 THEN 0
        ELSE ROUND(SUM(idx_blks_hit) * 100.0 / (SUM(idx_blks_hit) + SUM(idx_blks_read)), 2)
    END AS index_hit_ratio
FROM pg_statio_user_indexes;

-- Missing indexes (sequential scans on large tables)
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND seq_scan > 0
    AND pg_relation_size(schemaname||'.'||tablename) > 1000000  -- > 1MB
ORDER BY seq_tup_read DESC
LIMIT 20;

-- ============================================================================
-- 5. TABLE BLOAT (Dead tuples needing VACUUM)
-- ============================================================================

SELECT
    schemaname,
    tablename,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    CASE
        WHEN n_live_tup + n_dead_tup = 0 THEN 0
        ELSE ROUND(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2)
    END AS dead_tuple_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Tables needing VACUUM (> 10% dead tuples)
SELECT
    schemaname,
    tablename,
    n_dead_tup,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS size,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_dead_tup > 0
    AND ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 10
ORDER BY dead_pct DESC;

-- ============================================================================
-- 6. ACTIVE CONNECTIONS AND QUERIES
-- ============================================================================

-- Current connections by state
SELECT
    state,
    COUNT(*) AS connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connections DESC;

-- Active queries (currently running)
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    wait_event_type,
    wait_event,
    NOW() - query_start AS duration,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state = 'active'
    AND query NOT LIKE '%pg_stat_activity%'
    AND datname = current_database()
ORDER BY query_start ASC;

-- Long-running queries (> 5 minutes)
SELECT
    pid,
    usename,
    application_name,
    NOW() - query_start AS duration,
    state,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
    AND query_start < NOW() - INTERVAL '5 minutes'
    AND datname = current_database()
ORDER BY query_start ASC;

-- Idle in transaction (potential locks)
SELECT
    pid,
    usename,
    application_name,
    NOW() - state_change AS idle_duration,
    LEFT(query, 100) AS last_query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
    AND datname = current_database()
ORDER BY state_change ASC;

-- ============================================================================
-- 7. LOCKS AND BLOCKING QUERIES
-- ============================================================================

-- Current locks
SELECT
    locktype,
    database,
    relation::regclass AS table,
    page,
    tuple,
    transactionid,
    mode,
    granted,
    pid
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY granted, pid;

-- Blocking queries
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement,
    blocked_activity.application_name AS blocked_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- ============================================================================
-- 8. REPLICATION STATUS (if using replicas)
-- ============================================================================

-- Replication lag
SELECT
    client_addr,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replication_lag_bytes,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS replication_lag,
    write_lag,
    flush_lag,
    replay_lag
FROM pg_stat_replication;

-- ============================================================================
-- 9. CHECKPOINT AND WAL STATISTICS
-- ============================================================================

-- Checkpoint stats
SELECT
    checkpoints_timed,
    checkpoints_req,
    checkpoint_write_time,
    checkpoint_sync_time,
    buffers_checkpoint,
    buffers_clean,
    buffers_backend,
    buffers_backend_fsync,
    buffers_alloc,
    stats_reset
FROM pg_stat_bgwriter;

-- WAL generation rate
SELECT
    pg_current_wal_lsn() AS current_wal_location,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')) AS total_wal_generated;

-- ============================================================================
-- 10. VACUUM AND ANALYZE STATUS
-- ============================================================================

-- Recent vacuum/analyze operations
SELECT
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    vacuum_count,
    autovacuum_count,
    last_analyze,
    last_autoanalyze,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY GREATEST(last_autovacuum, last_autoanalyze) DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- 11. TRANSACTION ID WRAPAROUND (Critical!)
-- ============================================================================

-- Check for approaching XID wraparound (should be < 1 billion)
SELECT
    datname,
    age(datfrozenxid) AS xid_age,
    2147483648 - age(datfrozenxid) AS xids_remaining,
    CASE
        WHEN age(datfrozenxid) > 1500000000 THEN '🔴 CRITICAL - VACUUM IMMEDIATELY'
        WHEN age(datfrozenxid) > 1000000000 THEN '⚠️  WARNING - Plan VACUUM'
        ELSE '✅ OK'
    END AS status
FROM pg_database
ORDER BY age(datfrozenxid) DESC;

-- ============================================================================
-- 12. DISK I/O STATISTICS
-- ============================================================================

-- I/O stats per table
SELECT
    schemaname,
    tablename,
    heap_blks_read,
    heap_blks_hit,
    idx_blks_read,
    idx_blks_hit,
    toast_blks_read,
    toast_blks_hit,
    tidx_blks_read,
    tidx_blks_hit
FROM pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY heap_blks_read + idx_blks_read DESC
LIMIT 20;

-- ============================================================================
-- 13. AUTOVACUUM ACTIVITY
-- ============================================================================

-- Currently running autovacuum processes
SELECT
    pid,
    usename,
    application_name,
    NOW() - query_start AS duration,
    state,
    query
FROM pg_stat_activity
WHERE query LIKE 'autovacuum:%'
    AND state = 'active';

-- ============================================================================
-- MONITORING SETUP NOTES
-- ============================================================================
-- 1. Create monitoring user:
--    CREATE ROLE monitoring WITH LOGIN PASSWORD 'secure_password';
--    GRANT pg_monitor TO monitoring;
--
-- 2. Schedule regular checks (cron):
--    */5 * * * * psql -U monitoring -d ai_affiliate_empire -f monitoring.sql > /var/log/db-monitor.log
--
-- 3. Alert thresholds:
--    - Cache hit ratio < 99%: Increase shared_buffers
--    - Dead tuple % > 20%: Run VACUUM
--    - Long-running queries > 5min: Investigate/kill
--    - Locks: Identify blocking queries
--    - XID age > 1 billion: Run VACUUM FREEZE
--
-- 4. Grafana dashboards:
--    - Database size growth
--    - Query performance (pg_stat_statements)
--    - Connection pool usage
--    - Cache hit ratios
--    - Replication lag
--
-- 5. Kill long-running query:
--    SELECT pg_cancel_backend(pid);  -- Gentle cancel
--    SELECT pg_terminate_backend(pid);  -- Force kill
-- ============================================================================
