# Monitoring Setup Guide

Complete guide to setting up production-grade monitoring for AI Affiliate Empire system.

## Prerequisites

- Production environment deployed (Docker or Kubernetes)
- Access to external services (Discord, Sentry)
- Admin access to infrastructure
- Basic understanding of monitoring concepts

## Components Overview

| Component | Purpose | Service |
|-----------|---------|---------|
| **Sentry** | Error tracking & performance monitoring | Cloud |
| **Prometheus** | Metrics collection & time-series DB | Docker |
| **Grafana** | Dashboards & visualization | Docker |
| **AlertManager** | Alert routing & notifications | Docker |
| **Discord** | Real-time alert notifications | Cloud |

## Part 1: Discord Webhook Setup

### Step 1: Create Discord Server (if needed)

1. Go to Discord: https://discord.com
2. Click "Create a Server"
3. Name it: "AI Affiliate Empire Alerts"
4. Create a channel: "#monitoring"

### Step 2: Create Webhook

1. In Discord server, go to Channel Settings (gear icon)
2. Select "Integrations"
3. Click "Webhooks"
4. Click "Create Webhook"
5. Name it: "AI Affiliate Monitoring"
6. Copy the webhook URL - **SAVE THIS**

### Step 3: Configure Webhook URL

```bash
# Add to .env.production or .env.staging
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"

# Or set in docker-compose:
services:
  backend:
    environment:
      DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"
```

### Step 4: Test Webhook

```bash
# Run setup script with test mode
./scripts/setup/setup-monitoring.sh -e production -d "$DISCORD_WEBHOOK_URL" -t

# Or test manually:
curl -X POST https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🔔 Monitoring webhook test",
    "embeds": [{
      "title": "Test Notification",
      "description": "Discord webhook is working!",
      "color": 3066993
    }]
  }'
```

Expected result: Message appears in #monitoring channel ✅

## Part 2: Sentry Setup

### Step 1: Create Sentry Account

1. Go to Sentry: https://sentry.io
2. Sign up for free account
3. Verify email address

### Step 2: Create Project

1. Click "Projects" in sidebar
2. Click "Create Project"
3. Select "Node.js" as platform
4. Select "Express" as framework (or generic)
5. Name: "AI Affiliate Empire"

### Step 3: Get DSN

1. Project Settings → Client Keys (DSN)
2. Copy DSN URL - **SAVE THIS**
3. Format: `https://[public-key]@[host]/[project-id]`

### Step 4: Configure Sentry DSN

```bash
# Add to .env.production or .env.staging
export SENTRY_DSN="https://your-public-key@your-host.ingest.sentry.io/project-id"
export SENTRY_ENVIRONMENT="production"
export SENTRY_TRACES_SAMPLE_RATE="0.1"  # 10% of transactions for performance data

# Or in docker-compose:
services:
  backend:
    environment:
      SENTRY_DSN: "https://your-public-key@your-host.ingest.sentry.io/project-id"
      SENTRY_ENVIRONMENT: "production"
      SENTRY_TRACES_SAMPLE_RATE: "0.1"
```

### Step 5: Configure Alert Rules in Sentry

1. Go to Project → Alerts
2. Click "Create Alert Rule"

#### Rule 1: High Error Rate

- **Trigger**: When `count()` > 100 in the last 5 minutes
- **Action**: Send email to ops@yourdomain.com
- **Also**: Send to Discord via webhook

#### Rule 2: Release Regression

- **Trigger**: A new issue is created
- **Action**: Notify team
- **Severity**: High

#### Rule 3: Performance Regression

- **Trigger**: Transaction duration > 1000ms (p95)
- **Action**: Send alert
- **Severity**: Medium

## Part 3: Prometheus & Grafana Setup

### Pre-configured via Docker Compose

```bash
# Start monitoring stack
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services
docker-compose -f docker-compose.monitoring.yml ps

# Access dashboards
# Grafana: http://localhost:3002 (admin/admin)
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

### Configure Grafana

1. Access http://localhost:3002
2. Login: admin / admin
3. Change password immediately:
   - Profile → Change Password
4. Add Prometheus datasource:
   - Configuration → Data Sources → Add data source
   - Type: Prometheus
   - URL: http://prometheus:9090
   - Save & Test

### Import Dashboards

Dashboards are automatically provisioned:
- System Overview: `monitoring/grafana/dashboards/dashboard-overview.json`
- Cost Tracking: `monitoring/grafana/dashboards/dashboard-costs.json`
- Performance: `monitoring/grafana/dashboards/dashboard-performance.json`

To manually import:
1. Grafana → Dashboards → Import
2. Upload JSON file
3. Select Prometheus datasource
4. Click Import

## Part 4: Alert Configuration

### AlertManager Configuration

Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'YOUR_SLACK_WEBHOOK'  # Optional

receivers:
  - name: 'discord'
    webhook_configs:
      - url: 'https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN'
        send_resolved: true

  - name: 'critical'
    email_configs:
      - to: 'critical@yourdomain.com'
        smarthost: 'smtp.gmail.com:587'
        from: 'alerts@yourdomain.com'
        auth_username: 'alerts@yourdomain.com'
        auth_password: 'your-app-password'

routes:
  - receiver: 'critical'
    group_wait: 10s
    group_interval: 10s
    repeat_interval: 1h
    match:
      severity: 'critical'

  - receiver: 'discord'
    group_wait: 10s
    group_interval: 10s
    repeat_interval: 4h
    match:
      severity: 'warning'
```

### Alert Rules Configuration

Edit `monitoring/prometheus/alerts.yml`:

```yaml
groups:
  - name: affiliate_empire
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: ServiceDown
        expr: up{job="backend"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} has been down for 2 minutes"

      - alert: HighMemoryUsage
        expr: (nodejs_heap_used_bytes / nodejs_heap_size_limit_bytes) > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
```

Reload alerts:
```bash
docker-compose -f monitoring/docker-compose.monitoring.yml restart alertmanager
# Or send SIGHUP to Prometheus
docker kill -s HUP ai-affiliate-prometheus
```

## Part 5: Application Integration

### Enable Monitoring in Backend

```bash
# .env.production or .env.staging
SENTRY_ENABLED=true
SENTRY_DSN=<your-dsn>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

DISCORD_WEBHOOK_URL=<your-webhook-url>

PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
PROMETHEUS_SCRAPE_INTERVAL=15s

HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000  # 30 seconds
```

### Start Services

```bash
# Start main application
docker-compose up -d backend

# Verify monitoring is active
curl http://localhost:3000/health
curl http://localhost:3000/metrics

# Check Sentry initialization
docker logs ai-affiliate-backend | grep "Sentry"
```

### Verify Integration

1. **Sentry**:
   ```bash
   # Trigger test error
   curl http://localhost:3000/test-error
   ```
   Wait 30 seconds, check Sentry dashboard for error

2. **Prometheus Metrics**:
   ```bash
   curl http://localhost:3000/metrics | head -20
   ```
   Should see metrics like `http_requests_total`, `nodejs_heap_used_bytes`

3. **Health Check**:
   ```bash
   curl http://localhost:3000/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-11-01T...",
     "components": {
       "database": { "status": "healthy" },
       "temporal": { "status": "healthy" },
       "externalApis": { "status": "healthy" }
     }
   }
   ```

4. **Discord Alert**:
   ```bash
   ./scripts/monitoring/send-discord-alert.sh critical "Test Alert" "This is a test from monitoring setup"
   ```
   Should appear in Discord #monitoring channel

## Part 6: Health Check Endpoints

### Available Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Overall health | `{ status, components }` |
| `GET /health/ready` | Ready for traffic | `{ ready: boolean }` |
| `GET /health/live` | Service alive | `{ alive: boolean }` |
| `GET /metrics` | Prometheus metrics | Text format |
| `GET /health/database` | Database status | `{ status, details }` |
| `GET /health/temporal` | Temporal status | `{ status, details }` |
| `GET /health/apis` | External APIs status | `{ status, details }` |

### Kubernetes Probes Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-affiliate-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        image: ai-affiliate:latest

        # Startup probe - wait for service to start
        startupProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 30

        # Liveness probe - restart if dead
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe - ready to accept traffic
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 3
```

## Part 7: Testing Alerts

### Test Discord Alert

```bash
# Test critical alert
./scripts/monitoring/send-discord-alert.sh critical "Test Alert" "Critical alert test"

# Test warning alert
./scripts/monitoring/send-discord-alert.sh warning "Test Alert" "Warning alert test"

# Test success notification
./scripts/monitoring/send-discord-alert.sh success "Test Alert" "Success notification test"
```

### Test Backup Monitoring

```bash
# Check backup age
./scripts/monitoring/check-backup-status.sh

# Monitor in cron (add to crontab)
0 */6 * * * /path/to/scripts/monitoring/check-backup-status.sh
```

### Test API Health Monitoring

```bash
# Manual health check
./scripts/monitoring/check-api-health.sh

# Monitor in cron (every 5 minutes)
*/5 * * * * API_URL=https://yourdomain.com /path/to/scripts/monitoring/check-api-health.sh
```

### Trigger Test Error

```bash
# Endpoint that intentionally throws error
curl http://localhost:3000/api/test-error

# Check Sentry for error (wait 30 seconds)
# Should appear in Sentry Issues dashboard
```

## Part 8: Metrics Reference

### Business Metrics

```
affiliate_products_synced_total{platform,network}
affiliate_videos_generated_total{platform}
affiliate_api_cost_dollars{service}
affiliate_revenue_dollars{platform,category}
affiliate_active_products
affiliate_workflow_duration_seconds{workflow,status}
```

### Technical Metrics

```
http_requests_total{method,route,status}
http_request_duration_seconds{method,route}
http_request_errors_total{type}
nodejs_heap_used_bytes
nodejs_heap_size_limit_bytes
nodejs_eventloop_lag_seconds
database_query_duration_seconds{query}
temporal_workflow_duration_seconds{workflow,status}
```

## Part 9: Common Issues & Solutions

### Metrics Not Showing in Grafana

1. Verify Prometheus is running:
   ```bash
   docker-compose -f monitoring/docker-compose.monitoring.yml ps
   ```

2. Check backend is exporting metrics:
   ```bash
   curl http://localhost:3000/metrics | grep http_requests_total
   ```

3. Verify Prometheus scrape configuration:
   - Access http://localhost:9090/targets
   - Check if backend target shows "UP"

4. Adjust dashboard time range:
   - Click time range selector (top right)
   - Change to "Last 5 minutes" to see recent data

### Sentry Events Not Appearing

1. Verify DSN in backend logs:
   ```bash
   docker logs ai-affiliate-backend | grep "Sentry"
   ```

2. Test Sentry connection:
   ```bash
   curl http://localhost:3000/api/test-error
   ```

3. Check sample rate (default 10%):
   - Increase `SENTRY_TRACES_SAMPLE_RATE` to 1.0 for testing

4. Verify network connectivity:
   ```bash
   docker exec ai-affiliate-backend ping sentry.io
   ```

### Discord Webhook Not Working

1. Verify webhook URL:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"content":"Test"}' \
     "$DISCORD_WEBHOOK_URL"
   ```

2. Check webhook permissions:
   - Discord server → Channel settings → Webhooks
   - Verify webhook is active and not deleted

3. Ensure environment variable is set:
   ```bash
   echo $DISCORD_WEBHOOK_URL
   ```

### Alert Rules Not Triggering

1. Verify metrics are available:
   ```bash
   # In Prometheus UI: http://localhost:9090
   # Query: up{job="backend"}
   ```

2. Check alert expression syntax:
   ```bash
   # In Prometheus: Alerts tab
   # Look for parsing errors
   ```

3. Reload alerts:
   ```bash
   docker kill -s HUP ai-affiliate-prometheus
   ```

4. Increase alert rule evaluation:
   - Reduce `for` duration temporarily for testing
   - Monitor in Prometheus UI: Alerts tab

## Part 10: Production Checklist

- [ ] Discord webhook configured and tested
- [ ] Sentry project created with DSN
- [ ] Sentry alert rules configured
- [ ] Prometheus and Grafana running
- [ ] AlertManager configured
- [ ] Backend metrics endpoint verified (`/metrics`)
- [ ] Health check endpoints accessible
- [ ] Test error triggered and appears in Sentry
- [ ] Test alert sent to Discord
- [ ] Backup monitoring configured in cron
- [ ] API health monitoring configured in cron
- [ ] Dashboard dashboards loading
- [ ] No critical alerts firing continuously
- [ ] Team notified of alert channels
- [ ] On-call rotation established
- [ ] Runbook shared with team

## Part 11: Escalation & On-Call

### Alert Severity Levels

| Level | Response Time | Action |
|-------|---------------|--------|
| **Critical** | < 5 minutes | Page on-call, investigate immediately |
| **Warning** | < 30 minutes | Investigate within the hour |
| **Info** | < 4 hours | Review during business hours |

### On-Call Schedule

```
Week 1: Alice (alice@company.com)
Week 2: Bob (bob@company.com)
Week 3: Charlie (charlie@company.com)
```

### Escalation Path

```
1. Initial Alert → On-Call Engineer
2. No Response (5 min) → Escalate to Team Lead
3. No Response (10 min) → Escalate to Manager
4. No Response (15 min) → Page Multiple Members
```

## Support & Documentation

- Monitoring Guide: `/docs/monitoring-guide.md`
- Monitoring Runbook: `/docs/monitoring-runbook.md`
- Alert Response: `/docs/runbooks/incident-response.md`
- Sentry Docs: https://docs.sentry.io/
- Prometheus Docs: https://prometheus.io/docs/
- Grafana Docs: https://grafana.com/docs/

---

**Last Updated**: 2025-11-01
**Status**: Production Ready
**Version**: 1.0
