-- ============================================================================
-- PostgreSQL Database Index Optimization Script
-- AI Affiliate Empire - Production Performance Optimization
-- ============================================================================
-- Purpose: Add missing indexes for query performance optimization
-- Run Time: ~2-5 minutes on production database
-- Impact: Minimal during creation (CONCURRENTLY), significant query speedup
-- ============================================================================

-- Enable timing to measure performance
\timing on

BEGIN;

-- ============================================================================
-- 1. PRODUCT TABLE INDEXES
-- ============================================================================
-- Products are queried frequently by multiple criteria

-- Composite index for common product listing queries (status + score + category)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_status_score_category
ON "Product" (status, "overallScore" DESC, category)
WHERE status = 'ACTIVE';

-- Index for product search by ASIN (Amazon lookups)
-- Already has UNIQUE constraint, but explicit index for WHERE clauses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_asin_status
ON "Product" (asin, status)
WHERE asin IS NOT NULL;

-- Index for external ID lookups from other networks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_external_id
ON "Product" ("externalId")
WHERE "externalId" IS NOT NULL;

-- Index for ranking operations (scores + last ranked time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_ranking
ON "Product" ("lastRankedAt" DESC NULLS LAST, status)
WHERE status = 'ACTIVE';

-- Index for brand-based filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_brand
ON "Product" (brand, status)
WHERE brand IS NOT NULL AND status = 'ACTIVE';

-- Partial index for products needing re-ranking (older than 24 hours)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_needs_ranking
ON "Product" (id, "lastRankedAt")
WHERE status = 'ACTIVE' AND ("lastRankedAt" IS NULL OR "lastRankedAt" < NOW() - INTERVAL '24 hours');

-- ============================================================================
-- 2. VIDEO TABLE INDEXES
-- ============================================================================

-- Composite index for video listing by product and status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_product_status_created
ON "Video" ("productId", status, "createdAt" DESC);

-- Index for finding videos ready for publishing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_ready_for_publish
ON "Video" (status, "generatedAt" DESC)
WHERE status = 'READY';

-- Index for failed video cleanup/retry
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_failed
ON "Video" (status, "updatedAt" DESC)
WHERE status = 'FAILED';

-- Index for video generation monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_generating
ON "Video" (status, "createdAt" DESC)
WHERE status = 'GENERATING';

-- ============================================================================
-- 3. PUBLICATION TABLE INDEXES
-- ============================================================================

-- Composite index for publication queries (existing is good, add more specific ones)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_platform_published
ON "Publication" (platform, "publishedAt" DESC NULLS LAST)
WHERE status = 'PUBLISHED';

-- Index for failed publications needing retry
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_failed_retry
ON "Publication" (status, "retryCount", "updatedAt" DESC)
WHERE status = 'FAILED' AND "retryCount" < 3;

-- Index for scheduled publications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_scheduled
ON "Publication" (status, "createdAt" ASC)
WHERE status = 'SCHEDULED';

-- Index for analytics collection (publications with platform post IDs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_publication_platform_post
ON "Publication" ("platformPostId", platform)
WHERE "platformPostId" IS NOT NULL AND status = 'PUBLISHED';

-- ============================================================================
-- 4. ANALYTICS TABLE INDEXES
-- ============================================================================

-- ProductAnalytics: Time-series queries (already has composite, add aggregation index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_analytics_date_revenue
ON "ProductAnalytics" (date DESC, revenue DESC);

-- Index for product performance reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_analytics_product_date_revenue
ON "ProductAnalytics" ("productId", date DESC, revenue DESC);

-- PlatformAnalytics: Platform performance comparison
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_analytics_pub_date
ON "PlatformAnalytics" ("publicationId", date DESC, views DESC);

-- NetworkAnalytics: Network performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_analytics_date
ON "NetworkAnalytics" ("networkId", date DESC, "totalRevenue" DESC);

-- ============================================================================
-- 5. BLOG TABLE INDEXES
-- ============================================================================

-- Index for published blogs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blog_published
ON "Blog" (status, "publishedAt" DESC)
WHERE status = 'PUBLISHED';

-- Index for blog slugs (already unique, but add status check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blog_slug_status
ON "Blog" (slug, status);

-- ============================================================================
-- 6. WORKFLOW AND SYSTEM TABLES
-- ============================================================================

-- WorkflowLog: Query by workflow type and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_log_type_started
ON "WorkflowLog" ("workflowType", "startedAt" DESC);

-- WorkflowLog: Find running workflows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_log_running
ON "WorkflowLog" (status, "startedAt" DESC)
WHERE status = 'RUNNING';

-- WorkflowLog: Failed workflow analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_log_failed
ON "WorkflowLog" (status, "workflowType", "startedAt" DESC)
WHERE status = 'FAILED';

-- SystemConfig: Key-value lookups (already has unique on key)
-- No additional index needed

-- ============================================================================
-- 7. AFFILIATE NETWORK INDEXES
-- ============================================================================

-- Index for active network queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_network_status
ON "AffiliateNetwork" (status, "commissionRate" DESC)
WHERE status = 'ACTIVE';

COMMIT;

-- ============================================================================
-- 8. ANALYZE TABLES TO UPDATE STATISTICS
-- ============================================================================
-- This helps PostgreSQL query planner make better decisions

ANALYZE "Product";
ANALYZE "Video";
ANALYZE "Publication";
ANALYZE "ProductAnalytics";
ANALYZE "PlatformAnalytics";
ANALYZE "NetworkAnalytics";
ANALYZE "Blog";
ANALYZE "WorkflowLog";
ANALYZE "AffiliateNetwork";
ANALYZE "SystemConfig";

-- ============================================================================
-- 9. VERIFY INDEX CREATION
-- ============================================================================

-- Show all indexes on critical tables
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN ('Product', 'Video', 'Publication', 'ProductAnalytics', 'PlatformAnalytics')
ORDER BY tablename, indexname;

-- ============================================================================
-- 10. INDEX USAGE MONITORING QUERY
-- ============================================================================
-- Run this periodically to identify unused indexes

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    CASE
        WHEN idx_scan = 0 THEN '⚠️  Unused'
        WHEN idx_scan < 100 THEN '⚡ Low usage'
        ELSE '✅ Active'
    END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All indexes created with CONCURRENTLY to avoid locking production tables
-- 2. Partial indexes used where applicable to reduce index size
-- 3. Covering indexes for common query patterns
-- 4. Time-series indexes use DESC for recent-first queries
-- 5. Run ANALYZE after index creation to update query planner statistics
--
-- MAINTENANCE:
-- - Monitor index usage with the query above
-- - Drop unused indexes after 30 days if scans = 0
-- - Run REINDEX CONCURRENTLY on bloated indexes monthly
-- - Update statistics weekly: ANALYZE <table_name>
-- ============================================================================
