# Monitoring & Alert Response Runbook

Quick reference for responding to production alerts for AI Affiliate Empire.

## Alert Response Guide

### CRITICAL Alerts (< 5 min response)

#### Alert: ServiceDown

**What It Means**: Backend service is not responding to health checks

**Check Status**:
1. Verify the alert:
   ```bash
   curl http://localhost:3000/health
   # Expected: 200 OK with health data
   # Actual: Connection refused or timeout
   ```

2. Check service status:
   ```bash
   docker-compose ps ai-affiliate-backend
   # Expected: Up
   # Actual: Exited with code
   ```

**Common Causes & Fixes**:
| Cause | Check | Fix |
|-------|-------|-----|
| Crash | `docker logs ai-affiliate-backend \| tail -50` | Restart: `docker-compose restart backend` |
| OOM | `docker stats ai-affiliate-backend` | Increase memory limit in docker-compose.yml |
| DB connection lost | Check database connectivity | Restart database, verify connection string |
| Port conflict | `netstat -tulpn \| grep 3000` | Kill process using port 3000 |
| Resource exhausted | `docker stats` | Scale horizontally, increase instance resources |

**Recovery Steps**:
```bash
# 1. Stop service
docker-compose stop backend

# 2. Check logs for errors
docker logs ai-affiliate-backend

# 3. Verify dependencies are healthy
docker-compose ps  # All should be "Up"

# 4. Restart service
docker-compose start backend

# 5. Verify recovery
curl http://localhost:3000/health  # Should return 200

# 6. Monitor for 5 minutes
watch -n 5 "curl -s http://localhost:3000/health | jq '.status'"
```

**Escalation**:
- No recovery after 5 min → Contact platform team
- Repeated crashes → Review recent deployments
- Database unreachable → Page DBA

---

#### Alert: HighErrorRate

**What It Means**: More than 5% of requests are returning errors (5xx)

**Check Status**:
1. Verify error rate:
   ```bash
   # Prometheus: http://localhost:9090
   # Query: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
   ```

2. Find error patterns in Sentry:
   - Open Sentry dashboard
   - Review "Issues" tab
   - Look for recent errors with high frequency

**Common Causes**:
| Cause | Sentry Evidence | Fix |
|-------|-----------------|-----|
| External API down | "OpenAI API timeout" | Check API status page, implement fallback |
| Database deadlock | "Database connection pool exhausted" | Restart database, review slow queries |
| Bad deployment | New errors since last deploy | Rollback to previous version |
| Memory leak | Heap growing steadily | Restart service, profile memory usage |
| Temporal workflow failure | Workflow execution errors | Check Temporal UI, review workflow logic |

**Incident Response**:
```bash
# 1. Assess impact
curl http://localhost:3000/metrics | grep http_requests_total
# Identify which endpoints are failing

# 2. Check Sentry for error grouping
# Dashboard → Issues → Sort by frequency
# Identify top 3 error types

# 3. For external API failures
# Check if circuit breaker activated
docker logs ai-affiliate-backend | grep "circuit.*open"

# 4. Check database health
./scripts/monitoring/check-api-health.sh

# 5. If systematic issue, consider graceful degradation
# Disable non-critical features
# Return cached data
# Queue jobs for retry

# 6. For deployment-related issues
./scripts/rollback.sh  # If recent deploy
# Or manually revert to previous image version
```

**Recovery Options**:
1. **Quick fix** (if minor issue):
   - Restart service
   - Monitor for improvement

2. **Rollback** (if deployment-related):
   - `./scripts/rollback.sh`
   - Verify error rate drops

3. **Graceful degradation** (if external API down):
   - Enable cache fallback
   - Queue jobs for later
   - Return 202 Accepted instead of 500

4. **Scale up** (if capacity issue):
   - Increase replica count
   - Monitor CPU/memory
   - Add more nodes if needed

**Post-Incident**:
- [ ] Document root cause
- [ ] Add to runbook if new issue
- [ ] Create alert for prevention
- [ ] Update configuration
- [ ] Add test case

---

#### Alert: DatabaseConnectionFailure

**What It Means**: Cannot connect to PostgreSQL database

**Check Status**:
```bash
# 1. Verify database is running
docker-compose ps postgres

# 2. Test connection
docker exec ai-affiliate-postgres psql -U postgres -c "SELECT 1"

# 3. Check connection pool
docker logs ai-affiliate-backend | grep "pool"
```

**Common Causes**:
| Cause | Check | Fix |
|-------|-------|-----|
| DB down | `docker ps \| grep postgres` | `docker-compose restart postgres` |
| Connection limit | `psql -c "SELECT count(*) FROM pg_stat_activity"` | Increase max_connections in postgresql.conf |
| Credentials wrong | Check `.env` POSTGRES_URL | Verify credentials match |
| Network issue | `docker network ls` | Verify backend/db on same network |
| Disk full | `df -h` | Clean up logs, expand disk |

**Recovery Steps**:
```bash
# 1. Check database status
docker-compose ps postgres

# 2. If not running, start it
docker-compose start postgres

# 3. Verify it's healthy
docker exec ai-affiliate-postgres pg_isready

# 4. If hung, force restart
docker-compose restart postgres

# 5. For connection pool exhaustion
# Increase pool size in .env
PRISMA_DATABASE_URL_POOL_SIZE=50

# 6. Restart application
docker-compose restart backend

# 7. Monitor for recovery
watch -n 5 "docker logs ai-affiliate-backend | tail -1"
```

**Escalation**:
- DB still unreachable after restart → Contact DBA/Ops
- Disk full → Immediate disk expansion needed
- Repeated connection timeouts → Review query performance

---

### WARNING Alerts (< 30 min response)

#### Alert: HighApiCosts

**What It Means**: Daily API spending exceeded $100

**Check Status**:
1. View cost dashboard:
   - Grafana → AI Affiliate Empire - Cost Tracking
   - Check "Daily Cost Trend"

2. Identify culprit:
   ```bash
   # Prometheus query: rate(affiliate_api_cost_dollars[1h])
   # Shows cost per service
   ```

**Common Causes**:
| Service | Likely Cause | Fix |
|---------|--------------|-----|
| OpenAI | High token usage | Optimize prompts, reduce batch size |
| Anthropic | Heavy content generation | Reduce generation frequency |
| Pika Labs | Too many video generations | Batch videos, skip low-performers |
| ElevenLabs | Voice generation loops | Check for infinite retry loops |

**Investigation**:
```bash
# 1. Check cost breakdown
curl http://localhost:3000/metrics | grep affiliate_api_cost

# 2. Check workflow frequency
docker logs ai-affiliate-backend | grep "workflow started"

# 3. Check for errors causing retries
docker logs ai-affiliate-backend | grep -E "retry|exponential.*backoff"

# 4. Review Temporal workflows
# Access: http://localhost:8233
# Check execution history for high-frequency tasks
```

**Mitigation**:
```bash
# Option 1: Reduce generation frequency
# Edit .env
DAILY_LOOP_INTERVAL=86400  # Run once per day instead of hourly

# Option 2: Implement caching
# Reduce API calls for repeated requests
# Already implemented in redis module

# Option 3: Reduce sampling rate
SENTRY_TRACES_SAMPLE_RATE=0.05  # 5% instead of 10%

# Option 4: Limit batch sizes
MAX_VIDEOS_PER_RUN=5  # Instead of 10
MAX_PRODUCTS_PER_RUN=10  # Instead of 20
```

**Alert Configuration**:
- Duration: 1 hour (not immediate spike)
- Threshold: $100/day (adjust based on budget)
- Window: Last 24 hours

---

#### Alert: HighMemoryUsage

**What It Means**: Node.js process using > 90% of heap memory

**Check Status**:
```bash
# 1. Check current usage
docker stats ai-affiliate-backend --no-stream
# Memory column shows percentage

# 2. Check trend
curl http://localhost:3000/metrics | grep nodejs_heap

# 3. Check for memory leaks
docker logs ai-affiliate-backend | tail -20
```

**Common Causes**:
| Cause | Evidence | Fix |
|-------|----------|-----|
| Memory leak | Heap grows over time | Restart service, profile code |
| Large dataset processing | High memory spike at specific time | Add pagination, stream processing |
| Cache bloat | Cache size growing | Implement TTL, clear old entries |
| Event emitter leak | Many listeners attached | Use `removeAllListeners()`, debug emitters |

**Recovery Steps**:
```bash
# 1. If urgent, restart service (may lose in-flight requests)
docker-compose restart backend

# 2. Increase memory limit
# Edit docker-compose.yml
services:
  backend:
    environment:
      NODE_OPTIONS: "--max-old-space-size=4096"  # 4GB instead of default

# 3. Enable memory profiling
NODE_DEBUG=assert,http docker-compose restart backend

# 4. Use Node.js debugging tools
docker exec -it ai-affiliate-backend node --inspect=0.0.0.0:9229

# 5. Check for memory leaks (external profiling)
# Use clinic.js or autocannon for profiling
npm install -g clinic
clinic doctor -- npm start
```

**Monitoring**:
```
nodejs_heap_used_bytes / nodejs_heap_size_limit_bytes > 0.9 for 10m
```

---

#### Alert: NoProductsSynced

**What It Means**: No products synced in the last hour (business metric)

**Check Status**:
```bash
# 1. Check last sync time
curl http://localhost:3000/api/products/last-sync

# 2. Check product count
curl http://localhost:3000/api/products/count

# 3. Check Temporal workflows
# Access: http://localhost:8233
# Look for "daily-control-loop" execution status
```

**Common Causes**:
| Cause | Check | Fix |
|-------|-------|-----|
| Workflow paused | Temporal UI → Workflow list | Resume workflow in UI |
| API error | Check Sentry → Amazon API errors | Retry manually, check credentials |
| Rate limit | Logs show 429 responses | Wait and retry, adjust frequency |
| Invalid credentials | Amazon Associates auth fails | Update credentials in secrets manager |

**Recovery**:
```bash
# 1. Check Temporal UI
# http://localhost:8233 → Workflows → Search for recent executions

# 2. Retry sync manually
curl -X POST http://localhost:3000/api/orchestrator/sync-products

# 3. Check for API errors
docker logs ai-affiliate-backend | grep -i "amazon\|affiliate"

# 4. If blocked by rate limit
# Wait 1-2 hours before next attempt
# OR reduce batch size to avoid hitting limits

# 5. If credential issue
# Update .env with correct credentials
# Restart service
docker-compose restart backend
```

---

#### Alert: NoVideosGenerated

**What It Means**: No videos generated in the last 2 hours (business metric)

**Check Status**:
```bash
# 1. Check last video generation
curl http://localhost:3000/api/videos/last-generated

# 2. Check video queue
curl http://localhost:3000/api/videos/queue-status

# 3. Check costs (may have hit budget limit)
curl http://localhost:3000/api/cost-tracking/daily-summary
```

**Common Causes**:
| Cause | Evidence | Fix |
|-------|----------|-----|
| Pika Labs down | Sentry → "Pika API error" | Check pika.ai status, use backup generator |
| Budget limit hit | Cost > budget threshold | Adjust budget in config or wait for next day |
| Workflow crashed | Temporal UI shows failed execution | Check error in Temporal, fix and retry |
| Input products missing | No products available | Check product sync (see NoProductsSynced) |

**Recovery**:
```bash
# 1. Check Pika API status
curl -X GET https://api.pika.art/api/v1/health

# 2. Trigger manual generation
curl -X POST http://localhost:3000/api/orchestrator/generate-videos

# 3. Check for budget limits
curl http://localhost:3000/api/cost-tracking/budget-status
# If at limit, temporarily increase budget or wait for reset

# 4. Review Temporal execution
# Check workflow error in UI
# Fix underlying issue
# Retry from Temporal UI
```

---

### INFO Alerts (< 4 hours response)

#### Alert: RevenueDeclining

**What It Means**: Revenue in last 24h is lower than previous 24h

**Check Status**:
1. View performance dashboard:
   - Grafana → AI Affiliate Empire - Performance
   - Check "Revenue vs Costs" panel

2. Compare periods:
   ```bash
   # Last 7 days of revenue
   curl http://localhost:3000/api/analytics/revenue?period=7d
   ```

**Investigation Steps**:
1. Check if decline is temporary (e.g., weekend):
   - Compare same day last week
   - Check traffic trends

2. Identify problematic products:
   ```bash
   curl http://localhost:3000/api/analytics/products?sort=roi&limit=10
   # Look for products with ROI < 0.5 (being killed)
   ```

3. Check performance by platform:
   ```bash
   curl http://localhost:3000/api/analytics/platform-comparison
   # Identify which platform declined
   ```

4. Review content strategy:
   - Are we still generating videos?
   - Are videos being published?
   - Have topic trends changed?

**Action Items** (not urgent):
- Review A/B test results
- Adjust content strategy if needed
- Increase budget for winning niches
- Kill underperforming products
- Explore new affiliate networks

---

## Scheduled Maintenance Alerts

### Daily Checks (Business Hours)

```bash
# 1. Check overall health
curl http://localhost:3000/health | jq '.status'

# 2. Review Grafana dashboards
# System Overview: Look for any red/yellow indicators
# Performance: Check p95 latencies
# Cost: Verify spending is within budget

# 3. Check active alerts
# Prometheus → Alerts tab
# Should only see expected alerts
```

### Weekly Checks (Monday AM)

```bash
# 1. Review all alerts from past week
# Grafana → Dashboards → Alerts → Last 7 days

# 2. Check error rates by endpoint
curl http://localhost:3000/metrics | grep http_requests_total

# 3. Review Sentry for new error patterns
# Dashboard → Issues → Last 7 days
# Identify trends

# 4. Check backup status
./scripts/monitoring/check-backup-status.sh

# 5. Verify Prometheus retention
# Settings should retain 15 days of data
docker exec ai-affiliate-prometheus \
  cat /etc/prometheus/prometheus.yml | grep retention

# 6. Export Grafana dashboards
# Backup to version control
```

### Monthly Checks (First of Month)

```bash
# 1. Review monitoring configuration
# Validate alert thresholds
# Update based on baseline metrics

# 2. Capacity planning
# Review trends in:
# - API costs
# - Response times
# - Database size
# - Video generation volume

# 3. Update runbooks
# Document new issues found
# Update response procedures

# 4. Team training
# Review alert handling procedures
# Share new patterns discovered

# 5. Disaster recovery test
# Run backup restore procedure
# Verify RTO/RPO
```

---

## Monitoring Commands Reference

### Quick Health Check

```bash
# All-in-one health status
echo "=== Service Status ===" && \
docker-compose ps && \
echo "=== Health Check ===" && \
curl -s http://localhost:3000/health | jq . && \
echo "=== Metrics Sample ===" && \
curl -s http://localhost:3000/metrics | head -20
```

### Monitoring Stack Status

```bash
# Check all monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml ps

# View Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets'

# Check Grafana health
curl -s http://localhost:3002/api/health

# View AlertManager status
curl -s http://localhost:9093/api/v1/status
```

### Log Monitoring

```bash
# Tail backend logs
docker logs -f ai-affiliate-backend --tail=100

# Search for errors
docker logs ai-affiliate-backend | grep -i error

# Search for specific service
docker logs ai-affiliate-backend | grep "openai\|sentry\|amazon"

# Real-time log monitoring
watch -n 1 "docker logs ai-affiliate-backend | tail -20"
```

### Database Health Check

```bash
# Connection test
docker exec ai-affiliate-postgres psql -U postgres -c "SELECT now();"

# Active connections
docker exec ai-affiliate-postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check for blocking queries
docker exec ai-affiliate-postgres psql -U postgres -c \
  "SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;"

# Disk usage
docker exec ai-affiliate-postgres psql -U postgres -c \
  "SELECT datname, pg_size_pretty(pg_database_size(datname)) \
   FROM pg_database ORDER BY pg_database_size DESC;"
```

### Temporal Workflow Status

```bash
# List active workflows
# Access UI: http://localhost:8233

# Check workflow executions
curl -X GET \
  -H "Authorization: Bearer $(cat .env.production | grep TEMPORAL_TOKEN | cut -d= -f2)" \
  http://localhost:7233/workflows

# Get workflow details (if API available)
curl -X GET http://localhost:8233/api/workflows/search
```

---

## Common Alert Playbooks

### Scenario: Production is Slow

1. **Check metrics**:
   ```bash
   curl http://localhost:3000/metrics | grep http_request_duration
   # Look for p95/p99 latency values
   ```

2. **Identify bottleneck**:
   - Database slow queries: Check PostgreSQL logs
   - External API slow: Check respective API status pages
   - Memory pressure: Check `nodejs_heap_used_bytes`
   - CPU spike: Check `node_cpu_usage`

3. **Mitigation**:
   - If database: Run `ANALYZE`, check for missing indexes
   - If external API: Reduce rate, implement caching
   - If memory: Restart service, profile for leaks
   - If CPU: Scale horizontally, optimize algorithms

### Scenario: Memory Keeps Growing

1. **Confirm memory leak**:
   ```bash
   # Watch for 30+ minutes
   watch -n 60 "curl -s http://localhost:3000/metrics | grep 'nodejs_heap_used'"
   ```

2. **Identify cause**:
   - Check for event listener leaks
   - Review recent code changes
   - Profile with clinic.js or debugger

3. **Temporary fix**:
   ```bash
   docker-compose restart backend
   ```

4. **Permanent fix**:
   - Fix code issue
   - Add memory test to CI/CD
   - Monitor over 24 hours after fix

### Scenario: One Endpoint is Broken

1. **Verify**:
   ```bash
   curl -i http://localhost:3000/api/broken-endpoint
   # Check HTTP status code
   ```

2. **Check Sentry**:
   - Filter for endpoint name
   - Review error stack trace
   - Check for recent deployments

3. **Options**:
   - Roll back if deployment caused it
   - Fix code and re-deploy
   - Disable endpoint temporarily
   - Return 503 with maintenance message

---

## Escalation Contacts

### By Alert Type

| Alert Type | Primary | Secondary | Tertiary |
|------------|---------|-----------|----------|
| Service Down | On-Call | Team Lead | CTO |
| High Error Rate | On-Call | Backend Team | CTO |
| Database Issues | On-Call | DBA | CTO |
| API Integration | On-Call | Content Team | CTO |
| Cost Spike | Product Manager | Finance | CTO |
| Performance | On-Call | Infrastructure | CTO |

### Contact Methods

- **Slack**: #alerts channel (automatic)
- **Discord**: Direct message to on-call
- **PagerDuty**: For critical alerts (optional)
- **Email**: For non-urgent escalations

---

## Post-Incident Review

After any critical alert:

1. **Document**:
   - Root cause analysis
   - Timeline of events
   - Actions taken
   - Resolution time

2. **Update**:
   - Runbook with new issue
   - Alert thresholds if needed
   - Monitoring coverage gaps

3. **Prevent**:
   - Add test case
   - Improve observability
   - Consider redundancy

4. **Share**:
   - Team retrospective
   - Update documentation
   - Train team on response

---

**Last Updated**: 2025-11-01
**Status**: Production Ready
**Version**: 1.0
