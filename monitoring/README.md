# Monitoring Setup - AI Affiliate Empire

Complete monitoring stack with Prometheus, Grafana, and AlertManager.

## Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notifications
- **Node Exporter**: System metrics (CPU, memory, disk)
- **Postgres Exporter**: Database metrics

## Quick Start

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access interfaces
# - Grafana: http://localhost:3002 (admin/admin123)
# - Prometheus: http://localhost:9090
# - AlertManager: http://localhost:9093
```

## Configure Alerts

### 1. Slack Notifications

```bash
# Set Slack webhook in .env
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### 2. Discord Notifications

```bash
# Set Discord webhook in .env
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
```

## Metrics Available

### Application Metrics
- HTTP request rate and latency
- Error rate (5xx responses)
- Workflow success/failure rate
- Content generation metrics
- Publishing metrics
- Revenue tracking

### System Metrics
- CPU usage
- Memory usage
- Disk space
- Network I/O

### Database Metrics
- Connection pool usage
- Query performance
- Database size
- Active connections

## Alerts Configured

### Critical Alerts
- ❗ Database down
- ❗ High error rate (>5%)
- ❗ Disk space low (<10%)
- ❗ No videos published in 6 hours

### Warning Alerts
- ⚠️  High CPU usage (>80% for 10min)
- ⚠️  High memory usage (>90%)
- ⚠️  Workflow failures (>3 in 5min)
- ⚠️  Low conversion rate (<1%)
- ⚠️  API rate limit approaching
- ⚠️  Revenue drop (>50% vs yesterday)

## Grafana Dashboards

### Main Dashboard
- Revenue overview
- Content production stats
- System health
- Platform performance
- Top products

### System Dashboard
- CPU, Memory, Disk usage
- Network traffic
- Database connections
- Error rates

### Business Dashboard
- Revenue trends
- Conversion rates
- ROI tracking
- Cost analysis

## Alert Response

### Database Down
1. Check database container: `docker ps`
2. Check logs: `docker logs ai-affiliate-db`
3. Restart if needed: `docker restart ai-affiliate-db`

### High Error Rate
1. Check backend logs: `docker logs ai-affiliate-backend`
2. Review recent deployments
3. Check API key validity
4. Monitor Temporal workflows

### No Videos Published
1. Check Temporal UI: http://localhost:8233
2. Check worker status
3. Review workflow logs
4. Restart backend if needed

### Low Conversion Rate
1. Review content quality
2. Check affiliate link validity
3. Analyze A/B test results
4. Optimize CTAs and thumbnails

## Maintenance

### Data Retention
- Prometheus: 15 days (configurable in prometheus.yml)
- Grafana: Unlimited (dashboard configs)
- AlertManager: 24 hours

### Backup
```bash
# Backup Grafana dashboards
docker exec ai-affiliate-grafana grafana-cli admin backup

# Backup Prometheus data
docker run --rm -v prometheus_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/prometheus-backup.tar.gz /data
```

### Update
```bash
# Pull latest images
docker-compose -f docker-compose.monitoring.yml pull

# Restart with new images
docker-compose -f docker-compose.monitoring.yml up -d
```

## Troubleshooting

### Grafana not showing data
- Check Prometheus data source connection
- Verify Prometheus is scraping metrics
- Check time range selection

### Alerts not firing
- Verify AlertManager configuration
- Check webhook URLs
- Review alert rules in Prometheus

### High memory usage
- Increase Prometheus retention settings
- Enable metrics compression
- Scale horizontally if needed
