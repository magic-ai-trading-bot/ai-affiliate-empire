# Load Testing Guide

Comprehensive guide for load testing AI Affiliate Empire in production environments.

## Overview

Load testing validates that the system can handle expected traffic patterns and identifies performance bottlenecks before they impact users. This guide covers test scenarios, execution procedures, results interpretation, and performance tuning recommendations.

## Table of Contents

- [System Requirements](#system-requirements)
- [Test Architecture](#test-architecture)
- [Running Load Tests](#running-load-tests)
- [Interpreting Results](#interpreting-results)
- [Performance Tuning](#performance-tuning)
- [Common Bottlenecks](#common-bottlenecks)
- [Production Deployment](#production-deployment)

## System Requirements

### Expected Daily Load

Based on system design for **$10,000+/month revenue**:

| Metric | Daily Target | Peak Hour | Sustained Load |
|--------|-------------|-----------|----------------|
| Videos Generated | 1,000 | ~42/hour | ~0.7/min |
| Products Synced | 100 | ~4/hour | ~0.07/min |
| Analytics Queries | 500 | ~21/hour | ~0.35/min |
| Content Requests | 5,000 | ~208/hour | ~3.5/min |

**With 10x Safety Margin**:
- Support 100 concurrent workflows
- Handle 500 req/s during peak
- Manage 1,000 concurrent users

### Infrastructure Capacity

**Minimum Production Specs**:
- **API Servers**: 2x instances (auto-scaling to 10x)
- **Database**: PostgreSQL with 100 connections
- **Worker Nodes**: 4x Temporal workers
- **Memory**: 512MB per instance (steady-state)
- **CPU**: 2 cores per instance

## Test Architecture

### Test Scenarios

#### 1. Baseline Test
- **Purpose**: Establish performance baselines
- **Duration**: 5 minutes
- **Load**: 10 VUs constant
- **Frequency**: After every deployment

#### 2. Stress Test
- **Purpose**: Find breaking point
- **Duration**: 30 minutes
- **Load**: 0 → 200 VUs ramping
- **Frequency**: Before major releases

#### 3. Spike Test
- **Purpose**: Validate auto-scaling
- **Duration**: 10 minutes
- **Load**: 10 → 100 VUs sudden spike
- **Frequency**: Before traffic campaigns

#### 4. Soak Test
- **Purpose**: Detect memory leaks
- **Duration**: 2 hours
- **Load**: 50 VUs constant
- **Frequency**: Before production deployment

### Endpoint Coverage

**Critical Endpoints** (tested in all scenarios):
```
GET  /health                      - Health check
GET  /products                    - Product listing
GET  /products/top                - Top products
GET  /analytics/overview          - Analytics dashboard
GET  /analytics/revenue           - Revenue metrics
GET  /orchestrator/status         - Workflow status
POST /orchestrator/start          - Trigger workflow
```

**Write Endpoints** (tested selectively):
```
POST /products/sync               - Product synchronization
POST /content/generate-script     - Content generation
POST /video/generate              - Video generation
POST /publisher/publish           - Content publishing
```

## Running Load Tests

### Pre-Test Checklist

Before running load tests:

1. ✅ Verify target environment is stable
2. ✅ Confirm database has test data
3. ✅ Enable monitoring (logs, metrics)
4. ✅ Notify team of test schedule
5. ✅ Set baseline expectations
6. ✅ Prepare rollback plan

### Local Environment

```bash
# 1. Start services
docker-compose up -d

# 2. Verify health
curl http://localhost:3000/health

# 3. Run baseline test
npm run test:load:baseline

# 4. Review results
cat test/load/reports/baseline-summary.txt
```

### Staging Environment

```bash
# 1. Deploy to staging
fly deploy --app ai-affiliate-empire-staging

# 2. Wait for deployment
fly status --app ai-affiliate-empire-staging

# 3. Run comprehensive tests
./scripts/run-load-tests.sh all staging

# 4. Monitor during test
fly logs --app ai-affiliate-empire-staging

# 5. Review metrics
fly metrics --app ai-affiliate-empire-staging
```

### Production Environment

⚠️ **IMPORTANT**: Production load testing requires approval and careful planning.

**Pre-Production Load Test Protocol**:

1. **Schedule Maintenance Window**
   - Choose low-traffic period (2-4 AM UTC)
   - Notify stakeholders 24h in advance
   - Prepare incident response team

2. **Prepare Environment**
   ```bash
   # Scale up before test
   fly scale count 4 --app ai-affiliate-empire

   # Enable detailed logging
   fly config set LOG_LEVEL=debug
   ```

3. **Run Test**
   ```bash
   # Start with baseline (non-intrusive)
   ./scripts/run-load-tests.sh baseline production

   # Monitor continuously
   fly logs --app ai-affiliate-empire
   ```

4. **Monitor Key Metrics**
   - Response times (Sentry)
   - Error rates (Logs)
   - Database connections
   - Memory/CPU usage
   - Auto-scaling events

5. **Post-Test Actions**
   ```bash
   # Restore normal configuration
   fly config unset LOG_LEVEL

   # Scale back if needed
   fly scale count 2 --app ai-affiliate-empire
   ```

## Interpreting Results

### Success Criteria

| Test Type | p95 Response Time | Error Rate | Additional Criteria |
|-----------|-------------------|------------|---------------------|
| Baseline | < 500ms | < 1% | Stable performance |
| Stress | < 1000ms | < 5% | Graceful degradation |
| Spike | < 1000ms | < 5% | Recovery < 2 min |
| Soak | < 500ms | < 1% | No memory leaks |

### Example: Good Baseline Results

```
✓ http_req_duration............: avg=245ms  p(95)=485ms  p(99)=750ms
✓ http_req_failed..............: 0.12%
✓ http_reqs....................: 12,543 (83.62/s)
  iterations...................: 1,254
  vus..........................: 10
```

**Analysis**: ✅ Excellent
- p95 under 500ms threshold
- Error rate well below 1%
- Good throughput (83 req/s)

### Example: Concerning Stress Test Results

```
⚠ http_req_duration............: avg=850ms  p(95)=1,850ms  p(99)=3,200ms
✗ http_req_failed..............: 7.3%
  http_reqs....................: 45,231 (151.2/s)
  iterations...................: 4,523
  vus..........................: 200
```

**Analysis**: ⚠️ Needs Optimization
- p95 exceeds 1000ms threshold
- Error rate above 5% (critical)
- System struggles at 200 VUs

**Action Items**:
1. Optimize slow database queries
2. Increase connection pool size
3. Add caching layer
4. Review auto-scaling configuration

### Metrics Explained

#### Response Time Distribution

```
http_req_duration: avg=245ms min=50ms med=200ms max=1.2s p(90)=450ms p(95)=520ms
```

- **avg**: Mean response time (can be misleading)
- **med (p50)**: 50% of requests faster than this
- **p(90)**: 90% of requests faster than this
- **p(95)**: ⭐ **KEY METRIC** - 95% of requests faster
- **p(99)**: 99% of requests faster
- **max**: Slowest request (often outlier)

**Focus on p95**: It represents typical user experience while filtering outliers.

#### Error Rate

```
http_req_failed: 0.12% (15/12543)
```

- **Rate**: Percentage of failed requests
- **Count**: Absolute number of failures

**Acceptable**: < 1%
**Warning**: 1-5%
**Critical**: > 5%

#### Throughput

```
http_reqs: 12,543 (83.62/s)
```

- **Total**: Total requests during test
- **Rate**: Requests per second

**Target**: > 100 req/s for production readiness

## Performance Tuning

### Database Optimization

#### Problem: Slow Query Performance

**Symptoms**:
- p95 response time > 500ms
- Analytics endpoints slow
- Timeout errors under load

**Solutions**:

1. **Add Indexes**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_products_created_at ON products(created_at DESC);
   CREATE INDEX idx_analytics_date_range ON analytics(created_at, platform);
   CREATE INDEX idx_content_status ON content(status, created_at);

   -- Composite indexes for common queries
   CREATE INDEX idx_analytics_revenue ON analytics(platform, created_at, revenue);
   ```

2. **Optimize Queries**
   ```typescript
   // Before: N+1 query problem
   const products = await prisma.product.findMany();
   for (const product of products) {
     const analytics = await prisma.analytics.findMany({
       where: { productId: product.id }
     });
   }

   // After: Single query with join
   const products = await prisma.product.findMany({
     include: {
       analytics: true
     }
   });
   ```

3. **Implement Caching**
   ```typescript
   import { Cache } from '@nestjs/cache-manager';

   @Injectable()
   export class AnalyticsService {
     constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

     async getOverview() {
       const cacheKey = 'analytics:overview';
       const cached = await this.cache.get(cacheKey);
       if (cached) return cached;

       const data = await this.calculateOverview();
       await this.cache.set(cacheKey, data, 300); // 5 min TTL
       return data;
     }
   }
   ```

4. **Connection Pool Tuning**
   ```typescript
   // prisma/schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     // Increase pool size for high concurrency
     pool_timeout = 10
     connection_limit = 50
   }
   ```

### Application Optimization

#### Problem: High Memory Usage

**Symptoms**:
- Memory increases over time (soak test)
- Out of memory crashes
- Performance degradation

**Solutions**:

1. **Fix Memory Leaks**
   ```typescript
   // Before: Event listener leak
   export class VideoService {
     generateVideo() {
       emitter.on('frame', this.processFrame); // Never removed!
     }
   }

   // After: Proper cleanup
   export class VideoService implements OnModuleDestroy {
     private emitter = new EventEmitter();

     generateVideo() {
       this.emitter.on('frame', this.processFrame);
     }

     onModuleDestroy() {
       this.emitter.removeAllListeners();
     }
   }
   ```

2. **Stream Large Data**
   ```typescript
   // Before: Load entire file into memory
   const fileContent = await fs.readFile('large-file.mp4');

   // After: Stream processing
   const readStream = fs.createReadStream('large-file.mp4');
   readStream.pipe(processor).pipe(writeStream);
   ```

3. **Implement Pagination**
   ```typescript
   // Before: Return all products
   async getAllProducts() {
     return this.prisma.product.findMany(); // Could be 100,000+ records
   }

   // After: Paginated response
   async getProducts(page = 1, limit = 50) {
     return this.prisma.product.findMany({
       skip: (page - 1) * limit,
       take: limit,
     });
   }
   ```

### Infrastructure Scaling

#### Auto-Scaling Configuration

```toml
# fly.toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 2
  max_machines_running = 10

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"

# Auto-scaling rules
[scaling]
  min_count = 2
  max_count = 10

  [scaling.metrics]
    cpu_threshold = 70
    memory_threshold = 80
```

## Common Bottlenecks

### 1. Database Connection Pool Exhaustion

**Symptom**:
```
Error: Timeout acquiring connection from pool
```

**Detection**:
```sql
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

**Fix**:
- Increase pool size
- Fix connection leaks
- Implement connection retry logic

### 2. API Rate Limiting

**Symptom**:
```
HTTP 429: Too Many Requests
```

**Fix**:
```typescript
// Adjust rate limits for high traffic
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60 } }) // 100 req/min
export class ProductController {}
```

### 3. Temporal Worker Capacity

**Symptom**:
- Workflows queued
- Slow workflow execution
- Timeout errors

**Fix**:
```typescript
// Increase worker pool
const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  taskQueue: 'daily-control-loop',
  maxConcurrentWorkflowTaskExecutions: 100, // Increase from default
  maxConcurrentActivityTaskExecutions: 100,
});
```

### 4. External API Bottlenecks

**Symptom**:
- Timeout errors from OpenAI, Claude, etc.
- Cascading failures

**Fix**:
```typescript
// Implement circuit breaker
@Injectable()
export class OpenAIService {
  private breaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
  });

  async generateScript(prompt: string) {
    return this.breaker.execute(() =>
      this.openai.createCompletion({
        prompt,
        max_tokens: 500,
        timeout: 10000, // 10s timeout
      })
    );
  }
}
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All load tests passed on staging
- [ ] Performance meets acceptance criteria
- [ ] No memory leaks detected (soak test)
- [ ] Auto-scaling tested and configured
- [ ] Database indexes created
- [ ] Caching layer implemented
- [ ] Monitoring and alerts configured
- [ ] Rollback plan prepared

### Deployment Strategy

1. **Blue-Green Deployment**
   ```bash
   # Deploy to new instances
   fly deploy --no-swap

   # Run smoke tests
   npm run test:smoke:production

   # Swap traffic if successful
   fly deploy --swap
   ```

2. **Gradual Rollout**
   ```bash
   # Route 10% traffic to new version
   fly deploy --strategy canary --canary-percentage 10

   # Monitor metrics for 30 minutes
   # Increase gradually: 25% → 50% → 100%
   ```

### Post-Deployment Monitoring

**Monitor for 24 hours**:
- Response times (target: p95 < 500ms)
- Error rates (target: < 1%)
- Database performance
- Memory usage trends
- Auto-scaling events

**Alert Thresholds**:
```yaml
alerts:
  - name: High Response Time
    condition: p95 > 1000ms for 5 minutes
    action: Page on-call engineer

  - name: Error Rate Spike
    condition: error_rate > 5% for 2 minutes
    action: Auto-rollback + page engineer

  - name: Memory Leak
    condition: memory increase > 50MB/hour
    action: Alert DevOps team
```

## Continuous Performance Testing

### Weekly Automated Tests

```yaml
# .github/workflows/load-test.yml
schedule:
  - cron: '0 2 * * 1' # Every Monday 2 AM UTC

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - name: Run Baseline Test
        run: ./scripts/run-load-tests.sh baseline staging

      - name: Compare with Previous Baseline
        run: ./scripts/compare-baselines.sh

      - name: Alert on Degradation
        if: degradation > 20%
        run: ./scripts/send-alert.sh
```

### Performance Metrics Dashboard

Track trends over time:
- Response time percentiles (p50, p95, p99)
- Error rates by endpoint
- Throughput (req/s)
- Resource utilization
- Auto-scaling events

## References

- [k6 Documentation](https://k6.io/docs/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/automated-performance-testing/)
- [Load Testing Guide](/test/load/README.md)
- [System Architecture](/docs/system-architecture.md)

## Support

For load testing support:
- **Documentation**: This guide + `/test/load/README.md`
- **Issues**: GitHub Issues with `performance` label
- **Team**: DevOps team via Slack #performance channel
