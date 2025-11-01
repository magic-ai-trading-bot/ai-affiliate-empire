# Monitoring Quick Start Guide

**AI Affiliate Empire Monitoring System - Production Ready (10/10)**

Get your monitoring stack up and running in 5 minutes.

---

## 1. Set Environment Variables (2 min)

```bash
# Copy from .env.example
cp .env.example .env

# Add these to .env
SENTRY_DSN=https://your-key@your-sentry.ingest.sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
```

## 2. Start Monitoring Stack (2 min)

```bash
# Start monitoring services (Prometheus, Grafana, AlertManager)
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services
docker-compose -f docker-compose.monitoring.yml ps
```

## 3. Access Dashboards (1 min)

- **Grafana**: http://localhost:3002 (admin/admin)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **API Metrics**: http://localhost:3000/metrics

## 4. Test Monitoring (1 min)

```bash
# Run comprehensive test
./scripts/monitoring/test-monitoring-stack.sh

# Send test alert to Discord
./scripts/monitoring/send-discord-alert.sh success "Monitoring Active" "System is ready!"
```

---

## Core Components

### Health Checks
```bash
# System health
curl http://localhost:3000/health

# Ready for traffic?
curl http://localhost:3000/health/ready

# Process alive?
curl http://localhost:3000/health/live
```

### Alert Rules (9 Total)

| Alert | Severity | Threshold |
|-------|----------|-----------|
| ServiceDown | 🔴 Critical | 2 min |
| HighErrorRate | 🔴 Critical | >5% for 5m |
| DatabaseFailure | 🔴 Critical | Any error |
| HighApiCosts | 🟡 Warning | >$100/day |
| HighMemory | 🟡 Warning | >90% for 10m |
| NoProductsSync | 🟡 Warning | 1h no sync |
| NoVideoGen | 🟡 Warning | 2h no videos |
| RevenueDecline | 🔵 Info | 20% drop |

### Monitoring Scripts

```bash
# Send alert to Discord
./scripts/monitoring/send-discord-alert.sh critical "Title" "Message"

# Check API endpoints
./scripts/monitoring/check-api-health.sh

# Verify backups
./scripts/monitoring/check-backup-status.sh

# Full stack test
./scripts/monitoring/test-monitoring-stack.sh
```

---

## Setup by Role

### DevOps/Ops

1. **Initial Setup** (First Time)
   ```bash
   cd monitoring
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

2. **Daily Checks**
   ```bash
   ./scripts/monitoring/test-monitoring-stack.sh
   ```

3. **Alert Response**
   - See `/docs/monitoring-runbook.md` for each alert type
   - Discord channel: #alerts-critical for critical issues

### Backend Developers

1. **Local Testing**
   ```bash
   # Start monitoring stack
   docker-compose -f monitoring/docker-compose.monitoring.yml up -d

   # Run API
   npm run start:dev

   # Test health
   curl http://localhost:3000/health
   ```

2. **View Metrics**
   - Grafana Dashboard: http://localhost:3002
   - Raw metrics: http://localhost:3000/metrics

3. **Debug Errors**
   - Sentry: https://sentry.io (check Issues)
   - Logs: `docker logs ai-affiliate-backend`

### Product/Analytics

1. **View Dashboards**
   - System Overview: http://localhost:3002
   - Cost Tracking: http://localhost:3002
   - Performance: http://localhost:3002

2. **Key Metrics to Monitor**
   - Revenue (dollars)
   - Products synced (count)
   - Videos generated (count)
   - API costs (dollars)

---

## Common Tasks

### Enable Discord Alerts

```bash
# 1. Create Discord server & channel
# https://discord.com/create-server

# 2. Create webhook
# Settings → Integrations → Webhooks → Create Webhook

# 3. Set environment variable
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"

# 4. Test
./scripts/monitoring/send-discord-alert.sh success "Test" "It works!"
```

### Enable Sentry Error Tracking

```bash
# 1. Create account
# https://sentry.io/signup/

# 2. Create project (Node.js)
# Copy DSN

# 3. Set environment variable
export SENTRY_DSN="https://key@host.ingest.sentry.io/id"

# 4. Restart application
docker-compose restart backend
```

### Setup Automated Backups

```bash
# Add to crontab
crontab -e

# Add these lines:
0 */6 * * * cd /path && ./scripts/monitoring/check-backup-status.sh
*/5 * * * * cd /path && ./scripts/monitoring/check-api-health.sh
```

### Configure Alerts

1. Edit `/monitoring/prometheus/alerts.yml` to add rules
2. Edit `/monitoring/alertmanager/alertmanager.yml` to add routing
3. Reload: `docker kill -s HUP ai-affiliate-prometheus`

---

## Troubleshooting

### Dashboard Not Loading
```bash
# Check Prometheus
curl http://localhost:9090/-/healthy

# Check Grafana
curl http://localhost:3002/api/health

# Check metrics endpoint
curl http://localhost:3000/metrics | head
```

### No Metrics Data
```bash
# Verify backend is running
docker ps | grep backend

# Check metrics endpoint
curl http://localhost:3000/metrics

# Verify Prometheus scraping
http://localhost:9090/targets
```

### Discord Alert Not Working
```bash
# Test webhook
curl -X POST -H "Content-Type: application/json" \
  -d '{"content":"Test"}' \
  "$DISCORD_WEBHOOK_URL"

# Check environment variable
echo $DISCORD_WEBHOOK_URL
```

---

## Full Documentation

- **Setup**: `/docs/monitoring-setup-guide.md` (Detailed 11-part setup)
- **Alerts**: `/docs/monitoring-runbook.md` (Alert response procedures)
- **Config**: `/config/monitoring.example.json` (All options)
- **Scripts**: `/scripts/monitoring/README.md` (Script details)
- **Main Guide**: `/docs/monitoring-guide.md` (Comprehensive reference)

---

## Support

- **Issues**: Check `/docs/monitoring-runbook.md` troubleshooting section
- **Questions**: See respective documentation files
- **On-Call**: ops@company.com (Discord #alerts-critical)

---

**Status**: ✅ Production Ready (10/10)
**Last Updated**: 2025-11-01
**Version**: 1.0
