-- ============================================================================
-- PostgreSQL Data Retention and Cleanup Script
-- AI Affiliate Empire - Archive Old Analytics Data
-- ============================================================================
-- Purpose: Archive and cleanup old analytics data to maintain performance
-- Schedule: Run monthly via cron job
-- Retention Policy:
--   - ProductAnalytics: Keep 90 days, archive older
--   - PlatformAnalytics: Keep 90 days, archive older
--   - NetworkAnalytics: Keep 180 days (network trends matter long-term)
--   - WorkflowLog: Keep 30 days, delete older
--   - Failed Publications: Keep 7 days, delete older
--   - Archived Products: Clean up after 365 days
-- ============================================================================

\timing on

-- ============================================================================
-- 1. CREATE ARCHIVE TABLES (First run only)
-- ============================================================================

-- Archive table for ProductAnalytics
CREATE TABLE IF NOT EXISTS "ProductAnalytics_Archive" (
    LIKE "ProductAnalytics" INCLUDING ALL
);

-- Archive table for PlatformAnalytics
CREATE TABLE IF NOT EXISTS "PlatformAnalytics_Archive" (
    LIKE "PlatformAnalytics" INCLUDING ALL
);

-- Archive table for NetworkAnalytics
CREATE TABLE IF NOT EXISTS "NetworkAnalytics_Archive" (
    LIKE "NetworkAnalytics" INCLUDING ALL
);

-- ============================================================================
-- 2. ARCHIVE OLD PRODUCT ANALYTICS (90+ days)
-- ============================================================================

DO $$
DECLARE
    archived_count INTEGER;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '90 days';
BEGIN
    RAISE NOTICE 'Archiving ProductAnalytics older than %', cutoff_date;

    -- Move old data to archive
    WITH archived AS (
        INSERT INTO "ProductAnalytics_Archive"
        SELECT * FROM "ProductAnalytics"
        WHERE date < cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_count FROM archived;

    RAISE NOTICE 'Archived % ProductAnalytics records', archived_count;

    -- Delete archived data from main table
    DELETE FROM "ProductAnalytics"
    WHERE date < cutoff_date;

    RAISE NOTICE 'Deleted % ProductAnalytics records from main table', archived_count;
END $$;

-- ============================================================================
-- 3. ARCHIVE OLD PLATFORM ANALYTICS (90+ days)
-- ============================================================================

DO $$
DECLARE
    archived_count INTEGER;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '90 days';
BEGIN
    RAISE NOTICE 'Archiving PlatformAnalytics older than %', cutoff_date;

    -- Move old data to archive
    WITH archived AS (
        INSERT INTO "PlatformAnalytics_Archive"
        SELECT * FROM "PlatformAnalytics"
        WHERE date < cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_count FROM archived;

    RAISE NOTICE 'Archived % PlatformAnalytics records', archived_count;

    -- Delete archived data from main table
    DELETE FROM "PlatformAnalytics"
    WHERE date < cutoff_date;

    RAISE NOTICE 'Deleted % PlatformAnalytics records from main table', archived_count;
END $$;

-- ============================================================================
-- 4. ARCHIVE OLD NETWORK ANALYTICS (180+ days)
-- ============================================================================

DO $$
DECLARE
    archived_count INTEGER;
    cutoff_date DATE := CURRENT_DATE - INTERVAL '180 days';
BEGIN
    RAISE NOTICE 'Archiving NetworkAnalytics older than %', cutoff_date;

    -- Move old data to archive
    WITH archived AS (
        INSERT INTO "NetworkAnalytics_Archive"
        SELECT * FROM "NetworkAnalytics"
        WHERE date < cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO archived_count FROM archived;

    RAISE NOTICE 'Archived % NetworkAnalytics records', archived_count;

    -- Delete archived data from main table
    DELETE FROM "NetworkAnalytics"
    WHERE date < cutoff_date;

    RAISE NOTICE 'Deleted % NetworkAnalytics records from main table', archived_count;
END $$;

-- ============================================================================
-- 5. CLEANUP OLD WORKFLOW LOGS (30+ days)
-- ============================================================================

DO $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP := NOW() - INTERVAL '30 days';
BEGIN
    RAISE NOTICE 'Deleting WorkflowLog entries older than %', cutoff_date;

    -- Keep FAILED logs for 60 days for debugging
    DELETE FROM "WorkflowLog"
    WHERE "startedAt" < cutoff_date
      AND status != 'FAILED';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % WorkflowLog records', deleted_count;

    -- Delete FAILED logs older than 60 days
    DELETE FROM "WorkflowLog"
    WHERE "startedAt" < (NOW() - INTERVAL '60 days')
      AND status = 'FAILED';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old FAILED WorkflowLog records', deleted_count;
END $$;

-- ============================================================================
-- 6. CLEANUP FAILED PUBLICATIONS (7+ days)
-- ============================================================================

DO $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP := NOW() - INTERVAL '7 days';
BEGIN
    RAISE NOTICE 'Deleting failed Publication entries older than %', cutoff_date;

    -- Delete failed publications that exceeded retry count
    DELETE FROM "Publication"
    WHERE status = 'FAILED'
      AND "retryCount" >= 3
      AND "updatedAt" < cutoff_date;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % failed Publication records', deleted_count;
END $$;

-- ============================================================================
-- 7. CLEANUP OLD ARCHIVED PRODUCTS (365+ days)
-- ============================================================================

DO $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP := NOW() - INTERVAL '365 days';
BEGIN
    RAISE NOTICE 'Cleaning up ARCHIVED products older than %', cutoff_date;

    -- First, delete associated videos for archived products
    DELETE FROM "Video"
    WHERE "productId" IN (
        SELECT id FROM "Product"
        WHERE status = 'ARCHIVED'
          AND "updatedAt" < cutoff_date
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % videos for archived products', deleted_count;

    -- Then delete the products
    DELETE FROM "Product"
    WHERE status = 'ARCHIVED'
      AND "updatedAt" < cutoff_date;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % archived products', deleted_count;
END $$;

-- ============================================================================
-- 8. CLEANUP OLD FAILED VIDEOS (30+ days)
-- ============================================================================

DO $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMP := NOW() - INTERVAL '30 days';
BEGIN
    RAISE NOTICE 'Deleting FAILED videos older than %', cutoff_date;

    DELETE FROM "Video"
    WHERE status = 'FAILED'
      AND "updatedAt" < cutoff_date;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % failed videos', deleted_count;
END $$;

-- ============================================================================
-- 9. VACUUM AND ANALYZE CLEANED TABLES
-- ============================================================================
-- Reclaim disk space and update statistics

VACUUM ANALYZE "ProductAnalytics";
VACUUM ANALYZE "PlatformAnalytics";
VACUUM ANALYZE "NetworkAnalytics";
VACUUM ANALYZE "WorkflowLog";
VACUUM ANALYZE "Publication";
VACUUM ANALYZE "Product";
VACUUM ANALYZE "Video";

-- ============================================================================
-- 10. ARCHIVE SUMMARY REPORT
-- ============================================================================

SELECT
    'ProductAnalytics' as table_name,
    COUNT(*) as current_records,
    MIN(date) as oldest_date,
    MAX(date) as newest_date,
    pg_size_pretty(pg_total_relation_size('"ProductAnalytics"')) as table_size
FROM "ProductAnalytics"
UNION ALL
SELECT
    'ProductAnalytics_Archive',
    COUNT(*),
    MIN(date),
    MAX(date),
    pg_size_pretty(pg_total_relation_size('"ProductAnalytics_Archive"'))
FROM "ProductAnalytics_Archive"
UNION ALL
SELECT
    'PlatformAnalytics',
    COUNT(*),
    MIN(date),
    MAX(date),
    pg_size_pretty(pg_total_relation_size('"PlatformAnalytics"'))
FROM "PlatformAnalytics"
UNION ALL
SELECT
    'PlatformAnalytics_Archive',
    COUNT(*),
    MIN(date),
    MAX(date),
    pg_size_pretty(pg_total_relation_size('"PlatformAnalytics_Archive"'))
FROM "PlatformAnalytics_Archive"
UNION ALL
SELECT
    'WorkflowLog',
    COUNT(*),
    MIN("startedAt")::date,
    MAX("startedAt")::date,
    pg_size_pretty(pg_total_relation_size('"WorkflowLog"'))
FROM "WorkflowLog";

-- ============================================================================
-- NOTES & MAINTENANCE
-- ============================================================================
-- 1. Schedule this script to run monthly via cron:
--    0 2 1 * * psql $DATABASE_URL -f cleanup-old-data.sql >> /var/log/db-cleanup.log 2>&1
--
-- 2. Archive tables are kept indefinitely for historical analysis
--    - Consider exporting to data warehouse quarterly
--    - Or compress and backup to cold storage
--
-- 3. Monitor archive table sizes:
--    SELECT pg_size_pretty(pg_total_relation_size('"ProductAnalytics_Archive"'));
--
-- 4. To restore archived data:
--    INSERT INTO "ProductAnalytics" SELECT * FROM "ProductAnalytics_Archive" WHERE date > 'YYYY-MM-DD';
--
-- 5. Disk space reclamation:
--    - VACUUM FULL can be run during maintenance windows for max space reclaim
--    - Regular VACUUM is less intrusive and runs automatically
--
-- 6. Adjust retention periods based on business needs:
--    - Analytics: 90 days is good for trend analysis
--    - Logs: 30 days is sufficient for debugging
--    - Long-term trends: Query archive tables or data warehouse
-- ============================================================================
