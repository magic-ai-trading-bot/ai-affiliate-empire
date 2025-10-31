# Database Query Patterns - Quick Reference

## Common Anti-Patterns and Solutions

### 🔴 Anti-Pattern: N+1 Queries

```typescript
// ❌ BAD: Loads relation for each item (N+1)
const products = await prisma.product.findMany({
  include: { analytics: true }  // Separate query for each product
});
```

```typescript
// ✅ GOOD: Use groupBy aggregation
const products = await prisma.product.findMany({
  select: { id: true, title: true }
});
const analytics = await prisma.productAnalytics.groupBy({
  by: ['productId'],
  where: { productId: { in: products.map(p => p.id) } },
  _sum: { revenue: true, clicks: true }
});
```

---

### 🔴 Anti-Pattern: Sequential Inserts

```typescript
// ❌ BAD: Individual inserts in loop
for (const item of items) {
  await prisma.product.create({ data: item });  // N queries
}
```

```typescript
// ✅ GOOD: Bulk insert
await prisma.product.createMany({
  data: items,
  skipDuplicates: true  // Skip on unique constraint violation
});
```

---

### 🔴 Anti-Pattern: Sequential Updates

```typescript
// ❌ BAD: Individual updates in loop
for (const product of products) {
  await prisma.product.update({
    where: { id: product.id },
    data: { score: calculateScore(product) }
  });
}
```

```typescript
// ✅ GOOD: Batch updates in transaction
const updates = products.map(p => ({
  where: { id: p.id },
  data: { score: calculateScore(p) }
}));
await prisma.$transaction(
  updates.map(u => prisma.product.update(u))
);
```

---

### 🔴 Anti-Pattern: Over-fetching Data

```typescript
// ❌ BAD: Fetches all fields
const products = await prisma.product.findMany();
return products.map(p => ({ id: p.id, title: p.title }));
```

```typescript
// ✅ GOOD: Select only needed fields
const products = await prisma.product.findMany({
  select: { id: true, title: true }
});
```

---

### 🔴 Anti-Pattern: Deep Nesting

```typescript
// ❌ BAD: Triple nested includes
const product = await prisma.product.findUnique({
  where: { id },
  include: {
    videos: {
      include: {
        publications: {
          include: { analytics: true }  // 1 + N + N*M + N*M*P queries
        }
      }
    }
  }
});
```

```typescript
// ✅ GOOD: Separate strategic queries
const product = await prisma.product.findUnique({ where: { id } });
const videos = await prisma.video.findMany({ where: { productId: id } });
const videoIds = videos.map(v => v.id);
const analytics = await prisma.platformAnalytics.aggregate({
  where: { publication: { videoId: { in: videoIds } } },
  _sum: { views: true, clicks: true }
});
```

---

### 🔴 Anti-Pattern: Sequential Queries

```typescript
// ❌ BAD: Sequential execution
const youtube = await getStats('YOUTUBE');
const tiktok = await getStats('TIKTOK');
const instagram = await getStats('INSTAGRAM');
```

```typescript
// ✅ GOOD: Parallel execution
const [youtube, tiktok, instagram] = await Promise.all([
  getStats('YOUTUBE'),
  getStats('TIKTOK'),
  getStats('INSTAGRAM')
]);
```

---

## Prisma Query Optimization Cheat Sheet

### Efficient Data Fetching

```typescript
// Select specific fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
});

// Use include sparingly
const user = await prisma.user.findUnique({
  where: { id },
  include: { profile: true }  // Only if needed
});

// Paginate large datasets
const products = await prisma.product.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' }
});
```

### Aggregations

```typescript
// Count
const count = await prisma.product.count({
  where: { status: 'ACTIVE' }
});

// Sum, avg, min, max
const stats = await prisma.productAnalytics.aggregate({
  where: { productId },
  _sum: { revenue: true },
  _avg: { clicks: true },
  _min: { date: true },
  _max: { date: true }
});

// GroupBy with aggregation
const revenueByProduct = await prisma.productAnalytics.groupBy({
  by: ['productId'],
  where: { date: { gte: startDate } },
  _sum: { revenue: true, clicks: true },
  orderBy: { _sum: { revenue: 'desc' } }
});
```

### Batch Operations

```typescript
// Bulk insert
await prisma.product.createMany({
  data: products,
  skipDuplicates: true
});

// Bulk update (same value)
await prisma.product.updateMany({
  where: { status: 'PENDING' },
  data: { status: 'ACTIVE' }
});

// Bulk delete
await prisma.product.deleteMany({
  where: { status: 'ARCHIVED' }
});

// Transaction for different updates
await prisma.$transaction([
  prisma.product.update({ where: { id: '1' }, data: { score: 100 } }),
  prisma.product.update({ where: { id: '2' }, data: { score: 90 } }),
  prisma.product.update({ where: { id: '3' }, data: { score: 80 } })
]);
```

### Optimized Joins

```typescript
// Use IN clause for multiple IDs
const products = await prisma.product.findMany({
  where: { id: { in: productIds } }
});

// Filter relations
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    }
  }
});

// Use _count for relation counts
const users = await prisma.user.findMany({
  include: {
    _count: {
      select: { posts: true, comments: true }
    }
  }
});
```

---

## Index Patterns

### When to Add Indexes

```sql
-- ✅ DO: Index frequently filtered fields
CREATE INDEX idx_product_status ON "Product"("status");

-- ✅ DO: Index foreign keys
CREATE INDEX idx_product_network_id ON "Product"("networkId");

-- ✅ DO: Compound index for multi-column WHERE
CREATE INDEX idx_product_status_score
  ON "Product"("status", "overallScore" DESC);

-- ✅ DO: Index for ORDER BY
CREATE INDEX idx_product_created_at ON "Product"("createdAt" DESC);

-- ❌ DON'T: Index low-cardinality fields alone
-- CREATE INDEX idx_product_is_active ON "Product"("isActive"); -- Only 2 values

-- ❌ DON'T: Index fields that are rarely queried
-- CREATE INDEX idx_product_description ON "Product"("description");
```

### Index Order Matters

```sql
-- Query: WHERE status = 'ACTIVE' ORDER BY score DESC
CREATE INDEX idx_product_status_score
  ON "Product"("status", "overallScore" DESC);  -- ✅ Correct order

-- Query: WHERE category = 'tech' AND status = 'ACTIVE' ORDER BY score
CREATE INDEX idx_product_category_status_score
  ON "Product"("category", "status", "overallScore" DESC);  -- ✅ Most selective first
```

---

## Connection Pool Best Practices

```typescript
// Configure in schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")  // For migrations
}

// .env configuration
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20"
DIRECT_DATABASE_URL="postgresql://user:pass@host:5432/db"

// Pool size calculation
// connections = (CPU cores × 2) + disk spindles
// Example: 8 cores × 2 = 16-20 connections
```

---

## Performance Monitoring

### Enable Query Logging

```typescript
// Log all queries (development)
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Log slow queries only (production)
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 100) {  // Log queries > 100ms
    console.log('Slow query:', e.query);
    console.log('Duration:', e.duration + 'ms');
  }
});
```

### Check Index Usage

```sql
-- PostgreSQL: Explain query plan
EXPLAIN ANALYZE
SELECT * FROM "Product"
WHERE status = 'ACTIVE'
ORDER BY "overallScore" DESC
LIMIT 10;

-- Should show: Index Scan using idx_product_status_score

-- Check unused indexes
SELECT
  schemaname, tablename, indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pg_%'
ORDER BY tablename, indexname;
```

### Monitor Connections

```sql
-- Check active connections
SELECT count(*) as connections, state
FROM pg_stat_activity
WHERE datname = 'your_database'
GROUP BY state;

-- Check connection pool usage
SELECT
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity;
```

---

## Quick Wins Checklist

- [ ] Replace `include` with `select` for large datasets
- [ ] Use `createMany` instead of loop with `create`
- [ ] Use `$transaction` for batch updates
- [ ] Use `groupBy` and aggregations instead of post-processing
- [ ] Add indexes for frequently filtered/sorted fields
- [ ] Use `Promise.all` for parallel independent queries
- [ ] Enable connection pooling
- [ ] Log slow queries (> 100ms)
- [ ] Use `IN` clause for multiple ID lookups
- [ ] Paginate large result sets

---

## Common Query Time Estimates

| Operation | Without Index | With Index | Improvement |
|-----------|---------------|------------|-------------|
| Find by ID | 1ms | 0.1ms | 10x |
| Filter 10K rows | 50ms | 2ms | 25x |
| Sort 10K rows | 80ms | 3ms | 27x |
| Join 2 tables | 100ms | 5ms | 20x |
| Aggregate 100K rows | 500ms | 50ms | 10x |

---

**Remember**: Always measure before and after optimization. Use `EXPLAIN ANALYZE` to verify improvements.

**Last Updated**: 2025-10-31
