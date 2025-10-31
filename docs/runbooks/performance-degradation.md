# Performance Degradation Runbook

**Last Updated**: 2025-10-31
**Owner**: SRE/DevOps Team
**Review Cycle**: Quarterly

## Overview

Procedures for diagnosing and resolving performance issues in AI Affiliate Empire production environment.

---

## Performance Baselines

### Response Time Targets

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| GET /health | < 100ms | < 200ms | < 500ms |
| GET /api/products | < 500ms | < 1s | < 2s |
| POST /api/content/generate | < 30s | < 60s | < 120s |
| GET /api/analytics/* | < 1s | < 2s | < 3s |

### Resource Utilization Targets

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| CPU | 30-50% | 70% | 85% |
| Memory | 40-60% | 80% | 90% |
| Event Loop Lag | < 10ms | 50ms | 100ms |
| Database Connections | 10-20 | 50 | 80 |

---

## Quick Diagnostics

### Performance Health Check

```bash
# Run quick diagnostics
./scripts/performance-check.sh

# Or manual checks:

# 1. Response time check
curl -w "@curl-format.txt" -s -o /dev/null https://ai-affiliate-empire.fly.dev/health
# curl-format.txt:
# time_total: %{time_total}s

# 2. Resource usage
flyctl metrics --app ai-affiliate-empire

# 3. Database performance
flyctl postgres connect --app ai-affiliate-empire-db
SELECT * FROM pg_stat_activity;

# 4. Event loop lag
curl https://ai-affiliate-empire.fly.dev/metrics | grep nodejs_eventloop_lag_seconds

# 5. Error rate
curl https://ai-affiliate-empire.fly.dev/metrics | grep http_request_errors_total
```

---

## Issue 1: Identifying Bottlenecks

### Symptoms
- Slow response times across all endpoints
- High CPU or memory usage
- Event loop lag increasing
- Database queries timing out

### Diagnosis Steps

#### 1. Application Performance

```bash
# Check response times
curl https://ai-affiliate-empire.fly.dev/metrics | grep http_request_duration

# Access Grafana Performance Dashboard
# Review p95/p99 latencies

# Check which endpoints are slow
flyctl logs --app ai-affiliate-empire | grep "duration"
```

#### 2. CPU Bottleneck

```bash
# Check CPU usage
flyctl metrics --app ai-affiliate-empire

# If CPU > 80%:
# Access application
flyctl ssh console --app ai-affiliate-empire

# Install profiling tools
npm install -g clinic

# Profile CPU usage
clinic doctor -- node /app/dist/main.js

# Identify hot paths
# - Look for synchronous operations
# - CPU-intensive calculations
# - Regex operations
# - JSON parsing of large objects
```

**Common CPU Issues:**

1. **Synchronous Operations in Event Loop**
   ```typescript
   // Bad: Blocking
   const result = heavyCalculation();

   // Good: Async
   const result = await heavyCalculationAsync();
   ```

2. **Large JSON Parsing**
   ```typescript
   // Bad: Parsing huge JSON
   const data = JSON.parse(hugeString);

   // Good: Stream parsing
   const data = await streamJsonParse(hugeString);
   ```

3. **RegEx Performance**
   ```typescript
   // Bad: Complex regex on large strings
   const match = hugeString.match(/complex.*regex/);

   // Good: Simpler regex or string methods
   const match = hugeString.includes('pattern');
   ```

**Mitigation:**

```bash
# Immediate: Scale up CPU
flyctl scale vm dedicated-cpu-1x --app ai-affiliate-empire

# Add more instances
flyctl scale count 3 --app ai-affiliate-empire

# Long-term: Optimize code
# - Move CPU-intensive work to background jobs
# - Use worker threads
# - Optimize algorithms
```

#### 3. Memory Bottleneck

```bash
# Check memory usage
flyctl metrics --app ai-affiliate-empire

# If memory > 85%:
flyctl ssh console --app ai-affiliate-empire

# Check Node.js heap
node -e 'console.log(process.memoryUsage())'

# Generate heap snapshot
kill -USR2 <node-pid>  # Creates heap snapshot

# Download and analyze
# Use Chrome DevTools Memory Profiler
```

**Common Memory Issues:**

1. **Memory Leaks**
   ```typescript
   // Bad: Event listener leak
   events.forEach(event => {
     emitter.on(event, handler);  // Never removed
   });

   // Good: Clean up listeners
   const cleanup = () => {
     emitter.removeListener(event, handler);
   };
   ```

2. **Large Object Caching**
   ```typescript
   // Bad: Caching everything
   cache.set(key, largeObject, Infinity);

   // Good: TTL and size limits
   cache.set(key, largeObject, { ttl: 3600, maxSize: '100MB' });
   ```

3. **Uncontrolled Array Growth**
   ```typescript
   // Bad: Array grows unbounded
   results.push(...newResults);

   // Good: Limit size
   results = [...results, ...newResults].slice(-1000);
   ```

**Mitigation:**

```bash
# Immediate: Restart to clear memory
flyctl apps restart ai-affiliate-empire

# Scale up memory
flyctl scale vm shared-cpu-2x --app ai-affiliate-empire

# Long-term: Fix leaks
# - Identify leaking objects
# - Add proper cleanup
# - Implement memory monitoring
```

#### 4. Database Bottleneck

```bash
# Check slow queries
flyctl postgres connect --app ai-affiliate-empire-db

-- Top 10 slow queries
SELECT
  query,
  calls,
  mean_exec_time / 1000 as avg_seconds,
  max_exec_time / 1000 as max_seconds
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100  -- Potential index candidate
ORDER BY n_distinct DESC;

-- Check table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_dead_tup,
  ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_percent
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

**Mitigation:** See [Database Issues Runbook](./database-issues.md#2-slow-queries-identification)

---

## Issue 2: Database Query Optimization

### N+1 Query Problem

**Diagnosis:**
```bash
# Enable query logging
flyctl secrets set LOG_QUERIES=true --app ai-affiliate-empire

# Check logs for repeated similar queries
flyctl logs --app ai-affiliate-empire | grep "SELECT"

# Look for patterns like:
# SELECT * FROM products WHERE id = 1
# SELECT * FROM products WHERE id = 2
# SELECT * FROM products WHERE id = 3
```

**Solution:**
```typescript
// Bad: N+1 queries
const products = await prisma.product.findMany();
for (const product of products) {
  const category = await prisma.category.findUnique({
    where: { id: product.categoryId }
  });
}

// Good: Single query with join
const products = await prisma.product.findMany({
  include: {
    category: true
  }
});
```

### Missing Indexes

**Diagnosis:**
```sql
-- Check query execution plan
EXPLAIN ANALYZE
SELECT * FROM products
WHERE category_id = 1
ORDER BY created_at DESC
LIMIT 10;

-- Look for "Seq Scan" (bad) vs "Index Scan" (good)
```

**Solution:**
```sql
-- Add index for commonly filtered/sorted columns
CREATE INDEX CONCURRENTLY idx_products_category_created
ON products(category_id, created_at DESC);

-- Verify index usage
EXPLAIN ANALYZE
SELECT * FROM products
WHERE category_id = 1
ORDER BY created_at DESC
LIMIT 10;
-- Should now show "Index Scan"
```

### Large Result Sets

**Diagnosis:**
```bash
# Check for queries returning large datasets
flyctl logs --app ai-affiliate-empire | grep "rows returned"
```

**Solution:**
```typescript
// Bad: Loading all records
const products = await prisma.product.findMany();

// Good: Pagination
const products = await prisma.product.findMany({
  take: 100,
  skip: (page - 1) * 100
});

// Better: Cursor-based pagination
const products = await prisma.product.findMany({
  take: 100,
  cursor: lastProductId ? { id: lastProductId } : undefined
});
```

---

## Issue 3: Load Balancing Adjustments

### Symptoms
- Some instances overloaded, others idle
- Uneven request distribution
- Some users experiencing slow responses

### Diagnosis

```bash
# Check instance load distribution
flyctl status --app ai-affiliate-empire

# Example output:
# ID       PROCESS VERSION REGION STATUS  HEALTH  CHECKS    CPU   MEMORY
# abc123   app     v1.0    sjc    running passing 3/3       85%   60%
# def456   app     v1.0    sjc    running passing 3/3       30%   40%

# Problem: Uneven load distribution
```

### Solutions

#### 1. Fly.io Load Balancing (Automatic)

```bash
# Fly.io automatically load balances, but check config
cat deploy/fly.production.toml

# Ensure services configured correctly:
[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [services.concurrency]
    type = "connections"
    hard_limit = 250  # Adjust based on capacity
    soft_limit = 200
```

#### 2. Horizontal Scaling

```bash
# Add more instances for better distribution
flyctl scale count 5 --app ai-affiliate-empire

# Enable auto-scaling
# In fly.toml:
[scaling]
  min_machines = 2
  max_machines = 10
```

#### 3. Regional Distribution

```bash
# Deploy to multiple regions for global load distribution
flyctl regions list
flyctl regions add lax  # Los Angeles
flyctl regions add ewr  # New York

# Scale across regions
flyctl scale count 2 --region sjc
flyctl scale count 2 --region lax
flyctl scale count 2 --region ewr
```

---

## Issue 4: Horizontal Scaling

### When to Scale Horizontally

Scale out (add instances) when:
- CPU > 70% on all instances
- Response times consistently above target
- Traffic increasing steadily
- Need higher availability

### Scaling Procedure

```bash
# 1. Check current capacity
flyctl status --app ai-affiliate-empire

# 2. Scale up
flyctl scale count 4 --app ai-affiliate-empire

# 3. Monitor for 15 minutes
watch -n 30 'flyctl metrics --app ai-affiliate-empire'

# 4. Verify load distributed
flyctl status --app ai-affiliate-empire

# 5. Check response times improved
curl -w "%{time_total}" https://ai-affiliate-empire.fly.dev/api/products
```

### Auto-scaling Configuration

```toml
# deploy/fly.production.toml
[scaling]
  min_machines = 2
  max_machines = 10

[[metrics]]
  type = "cpu"
  target = 70

[[metrics]]
  type = "memory"
  target = 80

[[metrics]]
  type = "requests"
  target = 1000  # requests per second
```

---

## Issue 5: Caching Optimization

### Cache Strategy

```typescript
// 1. API Response Caching
import { Cache } from './cache';

async function getProducts() {
  const cacheKey = 'products:all';
  const cached = await cache.get(cacheKey);

  if (cached) return cached;

  const products = await prisma.product.findMany();
  await cache.set(cacheKey, products, { ttl: 3600 }); // 1 hour

  return products;
}

// 2. Database Query Result Caching
async function getProductById(id: string) {
  const cacheKey = `product:${id}`;
  const cached = await cache.get(cacheKey);

  if (cached) return cached;

  const product = await prisma.product.findUnique({ where: { id } });
  await cache.set(cacheKey, product, { ttl: 7200 }); // 2 hours

  return product;
}

// 3. Computation Caching
async function calculateTrends() {
  const cacheKey = 'trends:daily';
  const cached = await cache.get(cacheKey);

  if (cached) return cached;

  const trends = await expensiveTrendCalculation();
  await cache.set(cacheKey, trends, { ttl: 86400 }); // 24 hours

  return trends;
}
```

### Cache Invalidation

```typescript
// Invalidate on write operations
async function updateProduct(id: string, data: any) {
  await prisma.product.update({ where: { id }, data });

  // Invalidate related caches
  await cache.del(`product:${id}`);
  await cache.del('products:all');
  await cache.del('products:category:*');  // Pattern match
}
```

### Cache Monitoring

```bash
# Check cache hit rate
curl https://ai-affiliate-empire.fly.dev/metrics | grep cache_hit_rate

# Target: > 60% hit rate

# If low:
# - Increase TTL
# - Cache more endpoints
# - Pre-warm cache on startup
```

---

## Issue 6: API Rate Limiting

### Implementing Rate Limits

```typescript
import rateLimit from 'express-rate-limit';

// Public API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/api/', apiLimiter);

// Strict rate limit for expensive operations
const expensiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Rate limit exceeded for this operation.'
});

app.use('/api/content/generate', expensiveLimiter);
```

### Monitoring Rate Limits

```bash
# Check rate limit hits
curl https://ai-affiliate-empire.fly.dev/metrics | grep rate_limit_hits_total

# Check which IPs are being rate limited
flyctl logs --app ai-affiliate-empire | grep "rate limit"
```

---

## Issue 7: External API Performance

### Symptoms
- Slow responses from external APIs
- Timeout errors
- Circuit breaker opening frequently

### Diagnosis

```bash
# Check external service health
curl https://ai-affiliate-empire.fly.dev/health/services

# Check response times
curl https://ai-affiliate-empire.fly.dev/metrics | grep external_api_duration_seconds

# Check circuit breaker status
curl https://ai-affiliate-empire.fly.dev/metrics | grep circuit_breaker_state
```

### Solutions

#### 1. Implement Circuit Breaker

```typescript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000 // 30 seconds
};

const breaker = new CircuitBreaker(callExternalAPI, options);

breaker.on('open', () => {
  console.log('Circuit breaker opened - too many failures');
});

breaker.on('halfOpen', () => {
  console.log('Circuit breaker half-open - trying request');
});

// Use circuit breaker
const result = await breaker.fire(params);
```

#### 2. Implement Retry with Exponential Backoff

```typescript
async function callAPIWithRetry(params: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callExternalAPI(params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### 3. Implement Request Timeout

```typescript
import axios from 'axios';

const api = axios.create({
  timeout: 10000, // 10 seconds
  headers: {
    'User-Agent': 'AI-Affiliate-Empire/1.0'
  }
});

// Automatic timeout after 10 seconds
```

#### 4. Parallel Requests

```typescript
// Bad: Sequential (slow)
const result1 = await api1.call();
const result2 = await api2.call();
const result3 = await api3.call();

// Good: Parallel (fast)
const [result1, result2, result3] = await Promise.all([
  api1.call(),
  api2.call(),
  api3.call()
]);

// Better: Parallel with timeout
const [result1, result2, result3] = await Promise.all([
  api1.call(),
  api2.call(),
  api3.call()
].map(p => Promise.race([
  p,
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
])));
```

---

## Performance Testing

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or: https://k6.io/docs/getting-started/installation/

# Create test script: load-test.js
# export let options = {
#   vus: 100,  // 100 virtual users
#   duration: '5m',
# };
#
# export default function() {
#   http.get('https://ai-affiliate-empire.fly.dev/api/products');
# }

# Run load test
k6 run load-test.js

# Analyze results
# - Request rate (requests/sec)
# - Response time (p95, p99)
# - Error rate
# - Resource usage during test
```

### Stress Testing

```bash
# Gradually increase load until breaking point
k6 run --vus 10 --duration 5m load-test.js  # Baseline
k6 run --vus 50 --duration 5m load-test.js  # Moderate
k6 run --vus 100 --duration 5m load-test.js # High
k6 run --vus 200 --duration 5m load-test.js # Stress
k6 run --vus 500 --duration 5m load-test.js # Breaking point

# Identify:
# - Maximum sustainable load
# - Performance degradation points
# - Breaking point
# - Recovery behavior
```

---

## Performance Monitoring

### Key Metrics to Monitor

```yaml
# Grafana Performance Dashboard

# 1. Response Time (p50, p95, p99)
http_request_duration_seconds{quantile="0.95"}

# 2. Throughput (requests/sec)
rate(http_requests_total[1m])

# 3. Error Rate
rate(http_requests_total{status=~"5.."}[5m]) /
rate(http_requests_total[5m])

# 4. CPU Usage
nodejs_process_cpu_percent

# 5. Memory Usage
nodejs_heap_used_bytes / nodejs_heap_size_limit_bytes

# 6. Event Loop Lag
nodejs_eventloop_lag_seconds

# 7. Database Query Time
pg_query_duration_seconds{quantile="0.95"}

# 8. External API Response Time
external_api_duration_seconds{quantile="0.95"}

# 9. Cache Hit Rate
cache_hits_total / (cache_hits_total + cache_misses_total)

# 10. Active Connections
http_connections_active
```

### Performance Alerts

```yaml
# Alert when p95 response time > 3s
- alert: HighResponseTime
  expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 3
  for: 5m

# Alert when CPU > 80%
- alert: HighCPU
  expr: nodejs_process_cpu_percent > 80
  for: 10m

# Alert when memory > 90%
- alert: HighMemory
  expr: nodejs_heap_used_bytes / nodejs_heap_size_limit_bytes > 0.90
  for: 10m

# Alert when event loop lag > 100ms
- alert: EventLoopLag
  expr: nodejs_eventloop_lag_seconds > 0.1
  for: 5m
```

---

## Performance Optimization Checklist

### Application Level
- [ ] Async operations (no blocking calls)
- [ ] Connection pooling configured
- [ ] Caching implemented (60%+ hit rate)
- [ ] Rate limiting enabled
- [ ] Compression enabled (gzip/brotli)
- [ ] Static asset CDN
- [ ] Lazy loading where possible
- [ ] Pagination on large datasets

### Database Level
- [ ] Indexes on filtered/sorted columns
- [ ] Query optimization (no N+1)
- [ ] Connection pooling
- [ ] Regular VACUUM/ANALYZE
- [ ] Prepared statements
- [ ] Row-level locking (not table)

### Infrastructure Level
- [ ] Adequate instance size
- [ ] Horizontal scaling configured
- [ ] Auto-scaling enabled
- [ ] Load balancing working
- [ ] CDN for static assets
- [ ] Regional distribution (if global)

### Monitoring Level
- [ ] Performance dashboard configured
- [ ] Alerts for key metrics
- [ ] Regular performance reviews
- [ ] Load testing scheduled
- [ ] Baseline metrics documented

---

## Related Runbooks

- [Database Issues](./database-issues.md#6-performance-degradation) - Database performance
- [Monitoring Alerts](./monitoring-alerts.md) - Performance alerts
- [Incident Response](./incident-response.md#p2-degraded-performance) - Performance incidents

---

**Document Version**: 1.0
**Last Tested**: 2025-10-31
**Next Review**: 2026-01-31
