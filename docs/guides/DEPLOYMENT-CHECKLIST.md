# Database Optimization Deployment Checklist

**Date**: 2025-10-31
**Version**: 1.0.0
**Status**: Ready for Production

## Pre-Deployment

### 1. Code Review ✅
- [x] All optimizations implemented
- [x] TypeScript compiles without errors
- [x] No breaking changes to API contracts
- [x] Code follows best practices

### 2. Testing
- [ ] Run unit tests: `npm test`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Manual testing of optimized endpoints
- [ ] Load testing with realistic data

### 3. Database Preparation
- [ ] Backup current database
- [ ] Test index migration on staging
- [ ] Verify disk space for indexes (~10% of table size)

## Deployment Steps

### Step 1: Update Environment Variables

```bash
# Update .env file
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=20&pool_timeout=20"
DIRECT_DATABASE_URL="postgresql://user:password@host:5432/db"
```

**Verification**:
```bash
echo $DATABASE_URL | grep "connection_limit=20"
```

### Step 2: Apply Database Indexes

```bash
# Apply index migration
psql $DATABASE_URL -f prisma/migrations/add-performance-indexes.sql

# Or using direct connection
psql $DIRECT_DATABASE_URL -f prisma/migrations/add-performance-indexes.sql
```

**Verification**:
```sql
-- Check indexes created
\d+ Product
\d+ Video
\d+ Publication
\d+ ProductAnalytics
\d+ PlatformAnalytics

-- Should see 8 new indexes:
-- idx_product_created_at
-- idx_video_generated_at
-- idx_published_content_published_at
-- idx_product_status_overall_score
-- idx_video_status_generated_at
-- idx_publication_platform_status_published_at
-- idx_product_analytics_product_date
-- idx_platform_analytics_publication_date
```

### Step 3: Deploy Application

```bash
# Build application
npm run build

# Verify build success
echo $?  # Should be 0

# Deploy to production
npm run start:prod
```

### Step 4: Verify Deployment

**Health Check**:
```bash
curl http://localhost:3000/health
# Expected: {"status": "ok"}
```

**Test Optimized Endpoints**:
```bash
# Test product ranking
curl http://localhost:3000/api/products/ranked?limit=10

# Test analytics
curl http://localhost:3000/api/analytics/top-products?limit=5

# Test platform comparison
curl http://localhost:3000/api/analytics/platform-comparison
```

## Post-Deployment

### 1. Performance Monitoring

**Query Performance**:
```sql
-- Check slow queries (should be < 100ms)
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY total_time DESC
LIMIT 10;
```

**Index Usage**:
```sql
-- Verify indexes are being used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- All new indexes should have scans > 0 after some usage
```

**Connection Pool**:
```sql
-- Monitor connection usage
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'ai_affiliate_empire';

-- Active connections should stay below 20 (pool limit)
```

### 2. Application Logs

**Check for Errors**:
```bash
# Monitor application logs
tail -f logs/application.log | grep ERROR

# Should see no optimization-related errors
```

**Query Counts** (if logging enabled):
```bash
# Monitor query counts in logs
tail -f logs/application.log | grep "queries executed"

# Should see reduced query counts:
# - rankAllProducts: ~1 query (was 201)
# - syncFromAmazon: ~4 queries (was 251)
# - getTopProducts: ~2 queries (was 11)
```

### 3. Response Time Metrics

**Before Optimization**:
- GET /api/products/ranked: ~2000ms
- POST /api/products/sync/amazon: ~3500ms
- GET /api/analytics/top-products: ~150ms
- GET /api/analytics/product/:id/performance: ~800ms
- GET /api/analytics/platform-comparison: ~600ms

**After Optimization** (Expected):
- GET /api/products/ranked: ~10ms (200x improvement)
- POST /api/products/sync/amazon: ~45ms (80x improvement)
- GET /api/analytics/top-products: ~30ms (5x improvement)
- GET /api/analytics/product/:id/performance: ~250ms (3x improvement)
- GET /api/analytics/platform-comparison: ~200ms (3x improvement)

**Verify**:
```bash
# Use Apache Bench for load testing
ab -n 100 -c 10 http://localhost:3000/api/products/ranked

# Or use k6
k6 run performance-test.js
```

## Rollback Plan

If issues occur, follow these steps:

### 1. Rollback Application Code

```bash
# Revert to previous version
git revert HEAD~1

# Rebuild
npm run build

# Restart
npm run start:prod
```

### 2. Remove Indexes (if causing issues)

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_product_created_at;
DROP INDEX IF EXISTS idx_video_generated_at;
DROP INDEX IF EXISTS idx_published_content_published_at;
DROP INDEX IF EXISTS idx_product_status_overall_score;
DROP INDEX IF EXISTS idx_video_status_generated_at;
DROP INDEX IF EXISTS idx_publication_platform_status_published_at;
DROP INDEX IF EXISTS idx_product_analytics_product_date;
DROP INDEX IF EXISTS idx_platform_analytics_publication_date;
```

### 3. Revert Environment Variables

```bash
# Remove connection pooling
DATABASE_URL="postgresql://user:password@host:5432/db"
```

### 4. Restart Application

```bash
npm run start:prod
```

## Success Criteria

- [ ] All endpoints responding correctly
- [ ] Response times improved by expected amounts
- [ ] No increase in error rates
- [ ] Database connection pool stable (< 20 connections)
- [ ] Indexes being used (idx_scan > 0)
- [ ] No slow queries (> 100ms) for optimized operations
- [ ] Application logs show no optimization-related errors

## Troubleshooting

### Issue: Indexes not being used

**Check**:
```sql
EXPLAIN ANALYZE
SELECT * FROM "Product"
WHERE status = 'ACTIVE'
ORDER BY "overallScore" DESC;
```

**Solution**:
- Run `ANALYZE` to update table statistics
- Check query matches index columns
- Verify index exists: `\d+ Product`

### Issue: Connection pool exhausted

**Check**:
```sql
SELECT count(*) FROM pg_stat_activity;
```

**Solution**:
- Increase `connection_limit` in DATABASE_URL
- Check for connection leaks in application
- Implement query timeouts

### Issue: Performance not improved

**Check**:
- Verify indexes applied
- Check query logs for query counts
- Use EXPLAIN ANALYZE to verify query plans

**Solution**:
- Re-apply index migration
- Clear query cache: `SELECT pg_stat_reset();`
- Restart application

## Documentation

- [x] Implementation report: `plans/reports/251031-database-query-optimizations-report.md`
- [x] Quick summary: `DATABASE-OPTIMIZATION-SUMMARY.md`
- [x] Developer guide: `docs/database-optimization-guide.md`
- [x] Query patterns: `docs/database-query-patterns.md`
- [x] Deployment checklist: `DEPLOYMENT-CHECKLIST.md` (this file)

## Contact

For issues or questions:
- Review documentation in `/docs`
- Check application logs
- Monitor database performance
- Consult database-admin agent

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Production URL**: _________________
**Status**: [ ] Success [ ] Issues [ ] Rollback

**Notes**:
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
