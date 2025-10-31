-- Add performance indexes for database query optimization
-- Migration created: 2025-10-31
-- Purpose: Improve query performance for frequently accessed date-ordered queries

-- Index for Product createdAt (used in product listings)
CREATE INDEX IF NOT EXISTS "idx_product_created_at" ON "Product"("createdAt" DESC);

-- Index for Video generatedAt (used in video queries)
CREATE INDEX IF NOT EXISTS "idx_video_generated_at" ON "Video"("generatedAt" DESC);

-- Index for Publication publishedAt (used in publication queries)
CREATE INDEX IF NOT EXISTS "idx_published_content_published_at" ON "Publication"("publishedAt" DESC);

-- Additional compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_product_status_overall_score" ON "Product"("status", "overallScore" DESC);
CREATE INDEX IF NOT EXISTS "idx_video_status_generated_at" ON "Video"("status", "generatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_publication_platform_status_published_at" ON "Publication"("platform", "status", "publishedAt" DESC);

-- Indexes for analytics aggregation queries
CREATE INDEX IF NOT EXISTS "idx_product_analytics_product_date" ON "ProductAnalytics"("productId", "date" DESC);
CREATE INDEX IF NOT EXISTS "idx_platform_analytics_publication_date" ON "PlatformAnalytics"("publicationId", "date" DESC);

COMMENT ON INDEX "idx_product_created_at" IS 'Optimizes product listing queries ordered by creation date';
COMMENT ON INDEX "idx_video_generated_at" IS 'Optimizes video queries filtered by generation date';
COMMENT ON INDEX "idx_published_content_published_at" IS 'Optimizes publication queries ordered by publish date';
