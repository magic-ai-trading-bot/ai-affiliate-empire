# Monitoring Scripts

Automated monitoring and alerting scripts for AI Affiliate Empire.

## Scripts Overview

### send-discord-alert.sh

Sends formatted alerts to Discord webhook.

**Usage**:
```bash
./send-discord-alert.sh <severity> <title> <message> [emoji]
```

**Examples**:
```bash
# Critical alert
./send-discord-alert.sh critical "Database Down" "PostgreSQL connection failed"

# Warning alert
./send-discord-alert.sh warning "High Memory" "Heap usage at 85%"

# Success notification
./send-discord-alert.sh success "Backup Complete" "Database backup finished"

# Custom emoji
./send-discord-alert.sh info "Deployment" "New version deployed" "🚀"
```

**Environment Variable**:
- `DISCORD_WEBHOOK_URL`: Discord webhook endpoint (required)

**Return Codes**:
- `0`: Alert sent successfully
- `1`: Failed to send alert

---

### check-api-health.sh

Checks critical API endpoints and sends alerts on failures.

**Usage**:
```bash
./check-api-health.sh [api_url]
```

**Examples**:
```bash
# Check localhost
./check-api-health.sh

# Check production
./check-api-health.sh https://api.example.com

# Check with environment variable
API_URL=https://staging.example.com ./check-api-health.sh
```

**Endpoints Checked**:
- `/health` - Overall system health
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe
- `/metrics` - Prometheus metrics

**Environment Variables**:
- `API_URL`: API endpoint to check (default: http://localhost:3000)
- `DISCORD_WEBHOOK_URL`: Optional Discord webhook for alerts

**Return Codes**:
- `0`: All endpoints healthy
- `1`: One or more endpoints failed

---

### check-backup-status.sh

Checks database backup age and sends alerts if too old.

**Usage**:
```bash
./check-backup-status.sh [backup_dir] [max_age_hours]
```

**Examples**:
```bash
# Check default directory
./check-backup-status.sh

# Check specific directory
./check-backup-status.sh ./backups 24

# Check with environment variables
BACKUP_DIR=/backups BACKUP_MAX_AGE_HOURS=12 ./check-backup-status.sh
```

**Environment Variables**:
- `BACKUP_DIR`: Backup directory (default: ./backups)
- `BACKUP_MAX_AGE_HOURS`: Maximum age in hours (default: 24)
- `DISCORD_WEBHOOK_URL`: Optional Discord webhook for alerts

**Return Codes**:
- `0`: Backup is current
- `1`: Backup missing or too old

---

### test-monitoring-stack.sh

Comprehensive test of all monitoring components.

**Usage**:
```bash
./test-monitoring-stack.sh [environment]
```

**Examples**:
```bash
# Test localhost
./test-monitoring-stack.sh

# Test production
./test-monitoring-stack.sh production
```

**Checks**:
1. Backend health endpoints
2. Prometheus metrics endpoint
3. Prometheus server connectivity
4. Grafana server connectivity
5. AlertManager connectivity
6. Sentry DSN configuration
7. Discord webhook connectivity
8. Database health
9. Temporal workflow engine

**Environment Variables**:
- `API_URL`: API endpoint (default: http://localhost:3000)
- `PROMETHEUS_URL`: Prometheus URL (default: http://localhost:9090)
- `GRAFANA_URL`: Grafana URL (default: http://localhost:3002)
- `ALERTMANAGER_URL`: AlertManager URL (default: http://localhost:9093)

**Return Codes**:
- `0`: All tests passed
- `1`: Some tests failed

---

## Setting Up Automated Monitoring

### 1. Discord Webhook Configuration

```bash
# Set Discord webhook URL
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"

# Test it
./send-discord-alert.sh success "Test" "Webhook is working!"
```

### 2. API Health Checks (Cron)

Add to crontab for automatic monitoring:

```bash
# Check API health every 5 minutes
*/5 * * * * cd /path/to/project && ./scripts/monitoring/check-api-health.sh >> /var/log/api-health.log 2>&1

# Check every 15 minutes (less frequent)
*/15 * * * * cd /path/to/project && ./scripts/monitoring/check-api-health.sh
```

### 3. Backup Monitoring (Cron)

```bash
# Check backups every 6 hours
0 */6 * * * cd /path/to/project && BACKUP_DIR=./backups BACKUP_MAX_AGE_HOURS=24 ./scripts/monitoring/check-backup-status.sh >> /var/log/backup-health.log 2>&1

# Or every hour
0 * * * * cd /path/to/project && ./scripts/monitoring/check-backup-status.sh
```

### 4. Daily Monitoring Test

```bash
# Run full monitoring stack test daily at 8 AM
0 8 * * * cd /path/to/project && ./scripts/monitoring/test-monitoring-stack.sh production >> /var/log/monitoring-test.log 2>&1
```

### 5. Log Rotation

Create `/etc/logrotate.d/ai-affiliate-monitoring`:

```
/var/log/api-health.log
/var/log/backup-health.log
/var/log/monitoring-test.log
{
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  missingok
}
```

---

## Integration with Monitoring Stack

### Sentry Integration

Errors from backend are automatically sent to Sentry:

1. Configure `SENTRY_DSN` in `.env`
2. Backend will auto-initialize on startup
3. Errors appear in Sentry dashboard

```bash
# Verify Sentry is initialized
curl -s http://localhost:3000/health | jq .
# Should show Sentry in logs
```

### Prometheus Integration

Metrics are exposed at `/metrics` endpoint:

```bash
# View metrics
curl http://localhost:3000/metrics

# Query in Prometheus
# http://localhost:9090
# Query: http_requests_total
```

### Grafana Dashboards

Pre-configured dashboards available:

1. **System Overview**: General system health
2. **Performance**: Response times and throughput
3. **Cost Tracking**: API costs breakdown

Access at: http://localhost:3002

### AlertManager

Alerts are configured in:
- `monitoring/prometheus/alerts.yml` - Alert rules
- `monitoring/alertmanager/alertmanager.yml` - Alert routing

---

## Troubleshooting

### Script Permissions

If scripts aren't executable:
```bash
chmod +x scripts/monitoring/*.sh
```

### Missing Webhook URL

Script will fail if `DISCORD_WEBHOOK_URL` is not set:
```bash
# Set it globally
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"

# Or set in .env
echo "DISCORD_WEBHOOK_URL=..." >> .env
source .env
```

### Cron Not Running

Check if cron is running:
```bash
# macOS
sudo launchctl list | grep cron

# Linux
sudo systemctl status cron

# View crontab
crontab -l

# Edit crontab
crontab -e
```

### Script Timeout Issues

Increase timeout if network is slow:

Edit script and modify:
```bash
TIMEOUT=10  # Instead of 5
```

---

## Best Practices

1. **Test Before Deploying**: Run `test-monitoring-stack.sh` before production
2. **Log Everything**: Redirect script output to log files for audit trail
3. **Monitor the Monitors**: Set up alerts on the monitoring scripts themselves
4. **Rotate Logs**: Use logrotate to manage disk space
5. **Version Control**: Keep scripts in git for change tracking
6. **Document Changes**: Update this README when modifying scripts
7. **Test Alerts**: Periodically send test alerts to verify integration

---

## Examples

### Manual Alert Testing

```bash
# Critical alert
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"
./send-discord-alert.sh critical "Test Alert" "This is a test" "🚨"

# Check with details
./send-discord-alert.sh warning "API Slow" "Response time > 500ms" "⚠️"
```

### Health Check Monitoring

```bash
# Check current health
./check-api-health.sh

# Check specific endpoint
API_URL=https://api.example.com ./check-api-health.sh

# With detailed output
set -x  # Enable debug
./check-api-health.sh
set +x  # Disable debug
```

### Backup Verification

```bash
# Check current status
./check-backup-status.sh

# Force check specific directory
./check-backup-status.sh /mnt/backups 12

# With alerts enabled
DISCORD_WEBHOOK_URL="..." ./check-backup-status.sh
```

### Full Stack Test

```bash
# Test entire monitoring stack
./test-monitoring-stack.sh

# Test with custom endpoints
API_URL=https://api.example.com \
PROMETHEUS_URL=https://prometheus.example.com \
./test-monitoring-stack.sh production
```

---

## Support

For issues with monitoring scripts:

1. Check the script's help message
2. Review logs for detailed error messages
3. Run `test-monitoring-stack.sh` to verify all components
4. Check monitoring configuration in `config/monitoring.example.json`
5. Review monitoring setup guide: `/docs/monitoring-setup-guide.md`

---

**Last Updated**: 2025-11-01
**Version**: 1.0
**Status**: Production Ready
