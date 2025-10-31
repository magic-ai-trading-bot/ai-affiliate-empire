# Load Testing Framework

Comprehensive load testing suite for AI Affiliate Empire using k6.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Scenarios](#test-scenarios)
- [Acceptance Criteria](#acceptance-criteria)
- [Running Tests](#running-tests)
- [Interpreting Results](#interpreting-results)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

Install k6 load testing tool:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Run Your First Test

```bash
# Run baseline test on local environment
./scripts/run-load-tests.sh baseline local

# Run all tests
./scripts/run-load-tests.sh all local
```

## Test Scenarios

### 1. Baseline Test (`baseline.js`)

**Purpose**: Establish performance baselines under normal load

**Configuration**:
- Duration: 5 minutes
- Virtual Users: 10 (constant)
- Endpoints: All critical endpoints

**Success Criteria**:
- ✅ p95 response time < 500ms
- ✅ Error rate < 1%
- ✅ All endpoints return 200 status

**When to Run**:
- After every deployment
- Before/after major code changes
- Weekly automated runs

```bash
# Run locally
k6 run test/load/scenarios/baseline.js

# Run on staging
k6 run --env BASE_URL=https://staging.example.com test/load/scenarios/baseline.js
```

### 2. Stress Test (`stress-test.js`)

**Purpose**: Find the breaking point and maximum system capacity

**Configuration**:
- Duration: 30 minutes
- Virtual Users: 0 → 100 → 200 (ramping)
- Pattern: Gradual increase to identify limits

**Success Criteria**:
- ✅ System stable up to 100 VUs
- ✅ Error rate < 5% under stress
- ✅ Graceful degradation (no crashes)
- ✅ Auto-scaling triggers correctly

**When to Run**:
- Before major releases
- When planning capacity
- Quarterly performance reviews

```bash
./scripts/run-load-tests.sh stress staging
```

### 3. Spike Test (`spike-test.js`)

**Purpose**: Test system behavior under sudden traffic spikes

**Configuration**:
- Duration: 10 minutes
- Virtual Users: 10 → 100 (sudden spike)
- Simulates: Viral content, traffic surge

**Success Criteria**:
- ✅ System handles spike without crashes
- ✅ Auto-scaling triggers within 60 seconds
- ✅ Error rate < 5% during spike
- ✅ Recovery time < 2 minutes

**When to Run**:
- Before Black Friday/Cyber Monday
- Before marketing campaigns
- Before expected traffic surges

```bash
./scripts/run-load-tests.sh spike staging
```

### 4. Soak Test (`soak-test.js`)

**Purpose**: Detect memory leaks and verify long-term stability

**Configuration**:
- Duration: 2 hours
- Virtual Users: 50 (constant)
- Monitors: Memory, connections, resource leaks

**Success Criteria**:
- ✅ No memory leaks (stable memory usage)
- ✅ No performance degradation over time
- ✅ Error rate < 1% throughout
- ✅ Database connections remain stable

**When to Run**:
- Before production deployment
- After major infrastructure changes
- Monthly stability checks

```bash
./scripts/run-load-tests.sh soak staging
```

### 5. Endpoint-Specific Tests

#### Products (`products-load.js`)
Tests product discovery and management endpoints.

#### Analytics (`analytics-load.js`)
Tests analytics and reporting endpoints.

#### Orchestrator (`orchestrator-load.js`)
Tests workflow orchestration endpoints.

## Acceptance Criteria

### Performance Thresholds

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Response Time (p50) | < 200ms | < 300ms | > 500ms |
| Response Time (p95) | < 500ms | < 800ms | > 1000ms |
| Response Time (p99) | < 1000ms | < 1500ms | > 2000ms |
| Error Rate | < 0.5% | < 1% | > 5% |
| Requests/Second | > 100 | > 50 | < 10 |

### Capacity Requirements

Based on daily load expectations:

- **1000 videos/day** = ~0.7 videos/minute
- **100 products synced/day** = ~4 syncs/hour
- **500 analytics queries/day** = ~21 queries/hour

With 10x safety margin:
- Handle 10 concurrent workflow executions
- Support 500 req/s during peak hours
- Manage 1000 concurrent users

### Resource Limits

- Database pool connections: < 80% utilization
- Memory usage: < 512MB steady-state
- CPU usage: < 70% average

## Running Tests

### Local Development

```bash
# Ensure server is running
npm run start:dev

# In another terminal, run tests
npm run test:load:baseline
npm run test:load:products
npm run test:load:analytics
```

### Staging Environment

```bash
# Run baseline test
./scripts/run-load-tests.sh baseline staging

# Run comprehensive test suite
./scripts/run-load-tests.sh all staging
```

### Production Environment

⚠️ **Warning**: Only run production tests during maintenance windows or with approval.

```bash
# Run baseline only (non-intrusive)
./scripts/run-load-tests.sh baseline production
```

### Custom Test

```bash
# Direct k6 execution with custom parameters
k6 run \
  --vus 50 \
  --duration 10m \
  --env BASE_URL=http://localhost:3000 \
  test/load/scenarios/baseline.js
```

## Interpreting Results

### k6 Output Metrics

```
http_req_duration..........: avg=245ms  min=50ms  med=200ms  max=1.2s  p(90)=450ms  p(95)=520ms
http_req_failed............: 0.12%
http_reqs..................: 12543 (83.62/s)
iterations.................: 1254
vus........................: 10
```

**Key Metrics**:

1. **http_req_duration** (Response Time)
   - `avg`: Average response time
   - `p(95)`: 95% of requests faster than this (key metric)
   - `p(99)`: 99% of requests faster than this
   - `max`: Slowest request

2. **http_req_failed** (Error Rate)
   - Should be < 1%
   - Investigate if > 1%

3. **http_reqs** (Throughput)
   - Total requests and rate per second
   - Should meet capacity requirements

4. **iterations**
   - Number of complete test iterations
   - Higher is better

### Performance Analysis

#### ✅ Good Performance
```
p(95) < 500ms
Error rate < 1%
No significant degradation over time
```

#### ⚠️ Needs Optimization
```
p(95) between 500-1000ms
Error rate between 1-5%
Minor performance degradation
```

#### ❌ Critical Issues
```
p(95) > 1000ms
Error rate > 5%
Significant degradation or crashes
```

### Common Bottlenecks

1. **Slow Database Queries**
   - Symptom: High p95/p99 response times
   - Fix: Add indexes, optimize queries, implement caching

2. **Memory Leaks**
   - Symptom: Performance degradation in soak test
   - Fix: Profile application, fix memory leaks

3. **Connection Pool Exhaustion**
   - Symptom: Sudden error rate spike
   - Fix: Increase pool size, fix connection leaks

4. **CPU Saturation**
   - Symptom: High response times under load
   - Fix: Optimize hot paths, add horizontal scaling

## CI/CD Integration

### GitHub Actions

Automated load testing runs on:
- **Weekly schedule** (Monday 2 AM UTC)
- **Manual dispatch** (with parameters)
- **Optional**: On major releases

```bash
# Trigger manually
gh workflow run load-test.yml \
  -f test_type=baseline \
  -f environment=staging \
  -f comparison_enabled=true
```

### Performance Regression Detection

The CI workflow:
1. Runs baseline test
2. Compares with previous baseline
3. Alerts if p95 degrades > 20%
4. Fails build if error rate > 5%

## Troubleshooting

### Test Fails with Connection Errors

**Problem**: Cannot connect to API

**Solution**:
```bash
# Verify API is running
curl http://localhost:3000/health

# Check environment variable
echo $BASE_URL

# Run with explicit URL
k6 run --env BASE_URL=http://localhost:3000 test/load/scenarios/baseline.js
```

### High Error Rates

**Problem**: Error rate > 5%

**Investigation**:
1. Check server logs for errors
2. Monitor database connections
3. Check resource utilization (CPU, memory)
4. Review rate limiting configuration

**Solution**:
```bash
# Check server logs
docker logs ai-affiliate-empire-api

# Monitor resources
docker stats

# Check database
psql -d ai_affiliate_empire -c "SELECT count(*) FROM pg_stat_activity;"
```

### Slow Response Times

**Problem**: p95 > 1000ms

**Investigation**:
1. Enable query logging
2. Profile slow endpoints
3. Check database query performance
4. Review caching effectiveness

**Solution**:
```bash
# Enable PostgreSQL slow query log
ALTER DATABASE ai_affiliate_empire SET log_min_duration_statement = 100;

# Analyze slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Memory Leaks in Soak Test

**Problem**: Memory usage increases over time

**Investigation**:
1. Use memory profiler
2. Check for event listener leaks
3. Review connection pool management
4. Monitor heap snapshots

**Solution**:
```bash
# Run with memory profiling
node --inspect --max-old-space-size=4096 dist/main.js

# Connect Chrome DevTools for heap analysis
# chrome://inspect
```

## Best Practices

1. **Start Small**: Begin with baseline test before running stress/soak tests
2. **Use Staging First**: Never run intensive tests on production without approval
3. **Monitor Resources**: Watch CPU, memory, database during tests
4. **Compare Results**: Track performance trends over time
5. **Automate**: Integrate into CI/CD pipeline
6. **Document Issues**: Record findings and solutions
7. **Set Alerts**: Configure monitoring based on test thresholds

## Advanced Usage

### Custom Scenarios

Create custom test scenarios in `test/load/scenarios/`:

```javascript
import { BASE_URL, ENDPOINTS } from '../config.js';

export const options = {
  vus: 20,
  duration: '5m',
};

export default function() {
  // Your custom test logic
}
```

### Distributed Load Testing

For higher load, use k6 cloud or distributed mode:

```bash
# k6 Cloud (requires account)
k6 cloud test/load/scenarios/baseline.js

# Distributed with k6-operator (Kubernetes)
kubectl apply -f k6-job.yaml
```

### Integration with Grafana

1. Export k6 metrics to InfluxDB
2. Import k6 Grafana dashboard
3. Visualize real-time metrics

```bash
k6 run --out influxdb=http://localhost:8086/k6 test/load/scenarios/baseline.js
```

## Support

- **Documentation**: `/docs/load-testing.md`
- **Issues**: Report performance issues in GitHub Issues
- **Team**: Contact DevOps team for production load testing

## References

- [k6 Documentation](https://k6.io/docs/)
- [Performance Testing Guide](https://k6.io/docs/testing-guides/automated-performance-testing/)
- [Test Types](https://k6.io/docs/test-types/introduction/)
