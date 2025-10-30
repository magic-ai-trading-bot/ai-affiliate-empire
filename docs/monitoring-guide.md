# Monitoring & Observability Guide

## Overview

AI Affiliate Empire uses a production-grade monitoring stack consisting of:

- **Sentry**: Error tracking and performance monitoring
- **Prometheus**: Metrics collection and time-series database
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notification management

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Backend   │────▶│  Prometheus  │────▶│   Grafana    │
│  (metrics)  │     │  (scraping)  │     │ (dashboards) │
└─────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    ▼
       │            ┌──────────────┐     ┌──────────────┐
       │            │ AlertManager │────▶│  Webhooks    │
       │            └──────────────┘     │ Email/Slack  │
       │                                 └──────────────┘
       ▼
┌─────────────┐
│   Sentry    │
│  (errors)   │
└─────────────┘
```

## Access URLs

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Backend API | http://localhost:3000 | N/A |
| Metrics Endpoint | http://localhost:3000/metrics | N/A |
| Health Check | http://localhost:3000/health | N/A |
| Prometheus | http://localhost:9090 | N/A |
| Grafana | http://localhost:3002 | admin/admin |
| AlertManager | http://localhost:9093 | N/A |
| Temporal UI | http://localhost:8233 | N/A |

## Setup

### 1. Configure Sentry

1. Create a Sentry account at https://sentry.io
2. Create a new project for Node.js
3. Copy the DSN from project settings
4. Add to `.env`:
   ```
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   SENTRY_ENVIRONMENT=production
   SENTRY_TRACES_SAMPLE_RATE=0.1
   ```

### 2. Configure Grafana

1. Set admin password in `.env`:
   ```
   GRAFANA_ADMIN_USER=admin
   GRAFANA_ADMIN_PASSWORD=your-secure-password
   ```

### 3. Start Services

```bash
docker-compose up -d
```

All services will start automatically with health checks.

## Dashboards

### 1. System Overview Dashboard

**Access**: Grafana → Dashboards → AI Affiliate Empire - System Overview

**Panels**:
- **HTTP Request Rate**: Requests per second
- **HTTP Error Rate**: Percentage of failed requests
- **Products Synced (24h)**: Total products synced in last 24 hours
- **Videos Generated (24h)**: Total videos generated in last 24 hours
- **Current Revenue**: Cumulative revenue in dollars
- **Active Products**: Number of products being promoted
- **Memory Usage**: Node.js heap memory usage
- **Response Time (p95)**: 95th percentile API response time

**Use Cases**:
- Quick health check of entire system
- Monitor traffic patterns
- Track business metrics at a glance

### 2. Cost Tracking Dashboard

**Access**: Grafana → Dashboards → AI Affiliate Empire - Cost Tracking

**Panels**:
- **Total API Costs**: Cumulative cost across all services
- **Cost by Service**: Breakdown by OpenAI, Anthropic, Pika, ElevenLabs
- **Daily Cost Trend**: Cost trends over time
- **Cost per Video**: Average cost to generate one video
- **Revenue vs Costs**: ROI visualization

**Use Cases**:
- Monitor API spending
- Identify cost optimization opportunities
- Track profitability

### 3. Performance Dashboard

**Access**: Grafana → Dashboards → AI Affiliate Empire - Performance

**Panels**:
- **Workflow Duration**: p50, p90, p99 latencies by workflow
- **HTTP Response Time**: Latency by endpoint
- **Throughput**: Requests per second by endpoint
- **Workflow Success Rate**: Percentage of successful workflows
- **Event Loop Lag**: Node.js event loop delay

**Use Cases**:
- Identify performance bottlenecks
- Monitor system responsiveness
- Track workflow reliability

## Key Metrics

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `affiliate_products_synced_total` | Counter | Total products synced from affiliate networks |
| `affiliate_videos_generated_total` | Counter | Total videos generated |
| `affiliate_api_cost_dollars` | Gauge | Current API costs by service |
| `affiliate_workflow_duration_seconds` | Histogram | Workflow execution duration |
| `affiliate_revenue_dollars` | Gauge | Revenue by platform/category |
| `affiliate_active_products` | Gauge | Number of active products |

### Technical Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method/route/status |
| `http_request_duration_seconds` | Histogram | HTTP request duration |
| `http_request_errors_total` | Counter | HTTP errors by type |
| `nodejs_heap_used_bytes` | Gauge | Node.js heap memory usage |
| `nodejs_eventloop_lag_seconds` | Gauge | Event loop lag |

## Alerts

### Critical Alerts

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| **HighErrorRate** | Error rate > 5% for 5 min | < 15 min |
| **ServiceDown** | Backend down for 2 min | < 5 min |
| **DatabaseConnectionFailure** | DB errors detected | < 10 min |

### Warning Alerts

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| **HighApiCosts** | Daily costs > $100 | < 1 hour |
| **HighWorkflowFailureRate** | Failure rate > 10% | < 30 min |
| **HighMemoryUsage** | Memory > 90% for 10 min | < 1 hour |
| **NoProductsSynced** | No products for 1 hour | < 2 hours |
| **NoVideosGenerated** | No videos for 2 hours | < 4 hours |

### Info Alerts

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| **RevenueDeclining** | Revenue down vs 24h ago | Review daily |

## Alert Response Procedures

### HighErrorRate

1. **Check Grafana**: System Overview → HTTP Error Rate panel
2. **Identify source**: Check Sentry for error patterns
3. **Investigate**:
   - Check external API status (OpenAI, Anthropic)
   - Review recent deployments
   - Check database connection
4. **Mitigate**:
   - Rollback if deployment-related
   - Enable circuit breaker if external API issues
   - Scale resources if capacity issue

### ServiceDown

1. **Verify**: Try accessing http://localhost:3000/health
2. **Check logs**: `docker logs ai-affiliate-backend`
3. **Common causes**:
   - Database connection lost
   - Temporal unavailable
   - Out of memory
4. **Resolution**:
   - Restart service: `docker-compose restart backend`
   - Check dependencies: `docker-compose ps`
   - Review logs for root cause

### HighApiCosts

1. **Check**: Cost Tracking Dashboard
2. **Identify**: Which service is driving costs
3. **Investigate**:
   - Unusual traffic patterns
   - Workflow running too frequently
   - Failed requests being retried
4. **Actions**:
   - Adjust workflow schedules
   - Implement request caching
   - Review and optimize prompts
   - Consider reducing sample rate

### HighWorkflowFailureRate

1. **Check**: Temporal UI (http://localhost:8233)
2. **Review**: Failed workflow executions
3. **Common causes**:
   - External API rate limits
   - Invalid product data
   - Timeout issues
4. **Resolution**:
   - Implement exponential backoff
   - Add data validation
   - Increase timeout thresholds

## Troubleshooting

### Metrics Not Showing in Grafana

**Symptoms**: Empty panels in dashboards

**Solutions**:
1. Verify Prometheus is scraping:
   - Open http://localhost:9090/targets
   - Check backend target status is "UP"
2. Check metrics endpoint:
   - `curl http://localhost:3000/metrics`
   - Should return Prometheus format text
3. Verify Grafana datasource:
   - Grafana → Configuration → Data Sources
   - Test Prometheus connection
4. Check time range: Ensure dashboard time range includes data

### Sentry Events Not Appearing

**Symptoms**: No errors in Sentry dashboard

**Solutions**:
1. Verify DSN configured in `.env`
2. Check Sentry initialization:
   - Review backend logs for "Sentry initialized"
3. Test manually:
   - Trigger an error endpoint
   - Check Sentry web UI
4. Verify network connectivity from container
5. Check sampling rate (default 10%)

### Dashboard Queries Not Working

**Symptoms**: "No data" or query errors

**Solutions**:
1. Verify metric names match:
   - Check `/metrics` endpoint for exact names
2. Adjust time range:
   - Try "Last 1 hour" or "Last 15 minutes"
3. Check Prometheus query:
   - Test in Prometheus UI first
4. Review metric labels:
   - Ensure label names are correct

### High Alert Fatigue

**Symptoms**: Too many alerts firing

**Solutions**:
1. Review alert thresholds:
   - Adjust based on baseline metrics
   - Increase duration before firing
2. Implement inhibition rules:
   - Already configured for critical > warning
3. Add maintenance windows:
   - Silence during deployments
4. Group related alerts:
   - Configure in AlertManager

## Best Practices

### Dashboard Usage

1. **Daily Checks**:
   - Review System Overview dashboard each morning
   - Monitor Cost Tracking daily
   - Check for any active alerts

2. **Weekly Reviews**:
   - Analyze Performance dashboard trends
   - Review alert history
   - Adjust thresholds if needed

3. **Monthly Reviews**:
   - Cost optimization analysis
   - Performance baseline updates
   - Alert rule refinement

### Alert Management

1. **Acknowledge quickly**: Respond to critical alerts within SLA
2. **Document resolutions**: Update runbooks with new issues
3. **Tune thresholds**: Adjust based on production patterns
4. **Review regularly**: Monthly alert effectiveness review

### Sentry Best Practices

1. **Use breadcrumbs**: Track user actions leading to errors
2. **Set context**: Add product, workflow, user info
3. **Tag appropriately**: Use tags for filtering
4. **Release tracking**: Tag errors with deployment versions

### Prometheus Best Practices

1. **Label cardinality**: Keep label values bounded
2. **Metric naming**: Follow `domain_metric_unit` convention
3. **Histogram buckets**: Adjust based on actual distribution
4. **Scrape intervals**: 15s is optimal for most cases

## Advanced Configuration

### Custom Metrics

Add custom metrics in your services:

```typescript
// Inject MetricsService
constructor(private readonly metrics: MetricsService) {}

// Increment counter
this.metrics.incrementProductsSynced(count, {
  platform: 'amazon',
  network: 'associates'
});

// Record duration
this.metrics.recordWorkflowDuration(durationSeconds, {
  workflowName: 'daily-control-loop',
  status: 'success'
});
```

### Custom Alerts

Add new alert rules in `monitoring/prometheus/alerts.yml`:

```yaml
- alert: CustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Alert summary"
    description: "Alert description"
```

### Email Notifications

Configure in `monitoring/alertmanager/alertmanager.yml`:

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

### Slack Notifications

Add Slack webhook to AlertManager:

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

## Maintenance

### Data Retention

- **Prometheus**: 15 days (configurable in docker-compose.yml)
- **Grafana**: No data stored (queries Prometheus)
- **Sentry**: Based on plan (7-90 days)

### Backup

**Prometheus Data**:
```bash
docker exec ai-affiliate-prometheus tar czf - /prometheus > prometheus-backup.tar.gz
```

**Grafana Dashboards**:
- Dashboards are in git: `monitoring/grafana/dashboards/`
- Export from UI: Settings → JSON Model

### Updates

Update images:
```bash
docker-compose pull prometheus grafana alertmanager
docker-compose up -d
```

## Support

### Resources

- Prometheus Docs: https://prometheus.io/docs/
- Grafana Docs: https://grafana.com/docs/
- Sentry Docs: https://docs.sentry.io/
- AlertManager Docs: https://prometheus.io/docs/alerting/latest/alertmanager/

### Common Issues

| Issue | Solution |
|-------|----------|
| Prometheus out of disk | Reduce retention time or add disk space |
| Grafana slow queries | Reduce time range or optimize queries |
| Alert spam | Adjust thresholds or add inhibition rules |
| Sentry quota exceeded | Increase plan or reduce sample rate |

---

**Last Updated**: 2025-10-31
**Version**: 1.0
**Maintainer**: DevOps Team
