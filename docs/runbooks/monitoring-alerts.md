# Monitoring Alerts Runbook

**Last Updated**: 2025-10-31
**Owner**: SRE/DevOps Team
**Review Cycle**: Monthly

## Overview

Response procedures for all monitoring alerts in AI Affiliate Empire. Each alert includes severity level, response procedure, and escalation path.

---

## Alert Severity Levels

| Level | Response Time | Notification | Escalation |
|-------|---------------|--------------|------------|
| **Critical** | < 5 minutes | Page on-call + Slack/Discord | Immediate if unresolved in 15 min |
| **High** | < 15 minutes | Slack/Discord | After 30 min if unresolved |
| **Warning** | < 1 hour | Slack/Discord | After 4 hours if unresolved |
| **Info** | Next business day | Slack/Discord | None |

---

## Critical Alerts

### ServiceDown

**Alert Definition:**
```yaml
- alert: ServiceDown
  expr: up{job="ai-affiliate-empire"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Backend service is down"
    description: "AI Affiliate Empire backend has been down for 2 minutes"
```

**Response Procedure:**

1. **Verify Alert** (30 seconds)
   ```bash
   # Check if service is actually down
   curl -I https://ai-affiliate-empire.fly.dev/health

   # Check from multiple locations
   # Use: https://downforeveryoneorjustme.com
   ```

2. **Check Service Status** (1 minute)
   ```bash
   flyctl status --app ai-affiliate-empire
   flyctl logs --app ai-affiliate-empire | tail -50
   ```

3. **Identify Cause** (2 minutes)
   - Recent deployment? → Rollback
   - All instances crashed? → Check logs for crash reason
   - Infrastructure issue? → Check Fly.io status

4. **Take Action** (2 minutes)
   ```bash
   # If deployment-related
   ./scripts/rollback.sh production

   # If crashed
   flyctl apps restart ai-affiliate-empire

   # If resource exhaustion
   flyctl scale count 3 --app ai-affiliate-empire
   ```

5. **Escalate** if unresolved in 5 minutes

**Related Runbooks**: [Incident Response](./incident-response.md#p0-complete-system-outage)

---

### HighErrorRate

**Alert Definition:**
```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High HTTP error rate detected"
    description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
```

**Response Procedure:**

1. **Check Error Rate** (1 minute)
   ```bash
   # Check Sentry dashboard
   # Open: https://sentry.io

   # Check Grafana
   # System Overview → HTTP Error Rate panel

   # Get current metrics
   curl https://ai-affiliate-empire.fly.dev/metrics | grep http_request_errors_total
   ```

2. **Identify Error Source** (2 minutes)
   ```bash
   # Check logs for error patterns
   flyctl logs --app ai-affiliate-empire | grep -i "error\|fatal\|exception"

   # Check Sentry for common errors
   # Group by error type
   # Identify most frequent error
   ```

3. **Determine Cause** (2 minutes)
   - External API failure? → Check API status pages
   - Database issue? → Check database health
   - Recent deployment? → Consider rollback
   - Bad data? → Investigate specific requests

4. **Mitigate** (5 minutes)
   ```bash
   # If external API failure
   # Check circuit breaker status
   # Enable mock mode if needed
   flyctl secrets set ENABLE_MOCK_MODE=true --app ai-affiliate-empire

   # If database issue
   # See: database-issues.md

   # If deployment issue
   ./scripts/rollback.sh production

   # If bad data causing errors
   # Add input validation
   # Deploy hotfix
   ```

**Related Runbooks**: [Performance Degradation](./performance-degradation.md)

---

### DatabaseConnectionFailure

**Alert Definition:**
```yaml
- alert: DatabaseConnectionFailure
  expr: pg_up == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Cannot connect to PostgreSQL database"
    description: "Database connection has been failing for 1 minute"
```

**Response Procedure:**

1. **Verify Database Status** (1 minute)
   ```bash
   flyctl postgres status --app ai-affiliate-empire-db

   # Try connecting
   flyctl postgres connect --app ai-affiliate-empire-db
   ```

2. **Check Connection Pool** (1 minute)
   ```bash
   # If can connect, check pool
   SELECT count(*) FROM pg_stat_activity;
   SELECT max_connections FROM pg_settings WHERE name = 'max_connections';

   # Check for connection pool exhaustion
   SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
   ```

3. **Take Action** (3 minutes)
   ```bash
   # If database down
   flyctl postgres restart --app ai-affiliate-empire-db

   # If connection pool exhausted
   # Kill idle connections
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND state_change < current_timestamp - INTERVAL '10 minutes';

   # Restart app to reset connections
   flyctl apps restart ai-affiliate-empire
   ```

**Related Runbooks**: [Database Issues](./database-issues.md#1-connection-pool-exhausted)

---

## High Priority Alerts

### HighApiCosts

**Alert Definition:**
```yaml
- alert: HighApiCosts
  expr: sum(affiliate_api_cost_dollars) > 100
  for: 1h
  labels:
    severity: high
  annotations:
    summary: "Daily API costs exceed $100"
    description: "Current daily cost: ${{ $value }}"
```

**Response Procedure:**

1. **Check Cost Dashboard** (2 minutes)
   ```bash
   # Access Grafana Cost Tracking Dashboard
   # Identify which service is driving costs

   # Check metrics
   curl https://ai-affiliate-empire.fly.dev/metrics | grep affiliate_api_cost
   ```

2. **Identify Cost Driver** (5 minutes)
   - OpenAI costs high? → Check generation volume
   - ElevenLabs costs high? → Check voice synthesis
   - Pika costs high? → Check video generation

3. **Investigate Root Cause** (10 minutes)
   ```bash
   # Check workflow execution counts
   curl https://ai-affiliate-empire.fly.dev/api/workflows/stats

   # Check for runaway workflows
   # Access Temporal UI

   # Check logs for unusual activity
   flyctl logs --app ai-affiliate-empire | grep -i "generation\|api call"
   ```

4. **Take Action** (15 minutes)
   ```bash
   # Temporary: Reduce generation frequency
   # Update workflow schedule

   # Pause non-critical workflows
   # Via Temporal UI or API

   # Enable caching if not already
   flyctl secrets set ENABLE_CACHING=true

   # Review and optimize prompts
   # Reduce token usage
   ```

5. **Long-term Optimization**
   - Implement request caching
   - Optimize prompts for token efficiency
   - Adjust workflow schedules
   - Consider cheaper alternatives

**Related Runbooks**: [Cost Management](./cost-management.md)

---

### HighWorkflowFailureRate

**Alert Definition:**
```yaml
- alert: HighWorkflowFailureRate
  expr: rate(affiliate_workflow_failures_total[1h]) / rate(affiliate_workflow_executions_total[1h]) > 0.10
  for: 30m
  labels:
    severity: high
  annotations:
    summary: "Workflow failure rate exceeds 10%"
    description: "Failure rate: {{ $value | humanizePercentage }}"
```

**Response Procedure:**

1. **Check Temporal UI** (3 minutes)
   ```bash
   # Access Temporal UI
   # http://localhost:8233 or production equivalent

   # Review failed workflows
   # Identify common failure pattern
   ```

2. **Identify Failure Type** (5 minutes)
   - Timeout errors → Increase timeout
   - API rate limits → Implement backoff
   - Invalid data → Add validation
   - External service down → Enable circuit breaker

3. **Check Logs** (5 minutes)
   ```bash
   flyctl logs --app ai-affiliate-empire | grep -i "workflow\|failed\|error"

   # Look for patterns
   # Identify most common error
   ```

4. **Mitigate** (15 minutes)
   ```bash
   # If API rate limiting
   # Adjust request rate
   # Implement exponential backoff

   # If data validation issues
   # Add input validation
   # Deploy fix

   # If external service issues
   # Check service status
   # Enable fallback/mock mode
   flyctl secrets set ENABLE_MOCK_MODE=true
   ```

**Related Runbooks**: [Performance Degradation](./performance-degradation.md)

---

### HighMemoryUsage

**Alert Definition:**
```yaml
- alert: HighMemoryUsage
  expr: nodejs_heap_used_bytes / nodejs_heap_size_limit_bytes > 0.90
  for: 10m
  labels:
    severity: high
  annotations:
    summary: "Memory usage exceeds 90%"
    description: "Current usage: {{ $value | humanizePercentage }}"
```

**Response Procedure:**

1. **Check Memory Usage** (2 minutes)
   ```bash
   flyctl metrics --app ai-affiliate-empire

   # Check per-instance memory
   flyctl status --app ai-affiliate-empire
   ```

2. **Identify Memory Leak** (5 minutes)
   ```bash
   # Check logs for OOM errors
   flyctl logs --app ai-affiliate-empire | grep -i "out of memory\|oom"

   # Access instance
   flyctl ssh console --app ai-affiliate-empire

   # Check Node.js memory
   node -e 'console.log(process.memoryUsage())'
   ```

3. **Immediate Mitigation** (5 minutes)
   ```bash
   # Restart affected instances
   flyctl apps restart ai-affiliate-empire

   # Scale up memory if needed
   flyctl scale vm shared-cpu-2x --app ai-affiliate-empire

   # Add more instances to distribute load
   flyctl scale count 3 --app ai-affiliate-empire
   ```

4. **Investigation** (30 minutes)
   ```bash
   # Generate heap snapshot
   flyctl ssh console --app ai-affiliate-empire
   node --inspect app.js

   # Use Chrome DevTools to analyze
   # Identify objects retaining memory

   # Check for:
   # - Unreleased event listeners
   # - Cached data not being cleared
   # - Connection leaks
   ```

5. **Long-term Fix**
   - Fix memory leak in code
   - Implement proper cleanup
   - Add memory monitoring
   - Set up automatic restarts

**Related Runbooks**: [Performance Degradation](./performance-degradation.md#memory-leaks)

---

## Warning Alerts

### NoProductsSynced

**Alert Definition:**
```yaml
- alert: NoProductsSynced
  expr: increase(affiliate_products_synced_total[1h]) == 0
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "No products synced in the last hour"
    description: "Product sync may be failing"
```

**Response Procedure:**

1. **Check Workflow Status** (5 minutes)
   ```bash
   # Check product sync workflow
   curl https://ai-affiliate-empire.fly.dev/api/workflows/product-sync/status

   # Check Temporal UI for workflow executions
   ```

2. **Verify Affiliate Network Connectivity** (10 minutes)
   ```bash
   # Check network API status
   # Amazon Associates: Check AWS status
   # ShareASale: Check API status
   # CJ Affiliate: Check platform status

   # Test API connections
   curl https://ai-affiliate-empire.fly.dev/api/networks/test
   ```

3. **Check Logs** (5 minutes)
   ```bash
   flyctl logs --app ai-affiliate-empire | grep -i "product\|sync\|affiliate"
   ```

4. **Take Action** (20 minutes)
   - API down → Wait for recovery, enable alerts
   - Credentials expired → Refresh OAuth tokens
   - Rate limited → Adjust sync frequency
   - Data format changed → Update parser

**Related Runbooks**: [API Integration Issues](../api-integration-guide.md)

---

### NoVideosGenerated

**Alert Definition:**
```yaml
- alert: NoVideosGenerated
  expr: increase(affiliate_videos_generated_total[2h]) == 0
  for: 2h
  labels:
    severity: warning
  annotations:
    summary: "No videos generated in the last 2 hours"
    description: "Video generation may be failing"
```

**Response Procedure:**

1. **Check Content Generation Workflow** (5 minutes)
   ```bash
   curl https://ai-affiliate-empire.fly.dev/api/workflows/content-generation/status

   # Check Temporal UI
   ```

2. **Verify AI Services** (10 minutes)
   ```bash
   # Check OpenAI status
   curl https://status.openai.com

   # Check ElevenLabs status
   # Check Pika Labs status

   # Test API connections
   curl https://ai-affiliate-empire.fly.dev/health/services
   ```

3. **Check Logs** (5 minutes)
   ```bash
   flyctl logs --app ai-affiliate-empire | grep -i "video\|generation\|pika\|elevenlabs"
   ```

4. **Take Action** (30 minutes)
   - API down → Wait or enable mock mode
   - API key invalid → Update credentials
   - Rate limited → Adjust generation rate
   - Quota exceeded → Upgrade plan or reduce usage

---

### RevenueDeclining

**Alert Definition:**
```yaml
- alert: RevenueDeclining
  expr: sum(rate(affiliate_revenue_dollars[24h])) < sum(rate(affiliate_revenue_dollars[24h] offset 24h))
  for: 24h
  labels:
    severity: warning
  annotations:
    summary: "Revenue declining compared to previous day"
    description: "Revenue down {{ $value | humanizePercentage }}"
```

**Response Procedure:**

1. **Review Analytics** (10 minutes)
   ```bash
   # Check revenue dashboard
   curl https://ai-affiliate-empire.fly.dev/api/analytics/revenue/summary

   # Compare metrics
   # - Views down?
   # - CTR down?
   # - Conversion rate down?
   ```

2. **Identify Cause** (20 minutes)
   - Platform algorithm change?
   - Content quality degraded?
   - Products out of stock?
   - Seasonal variation?

3. **Investigate Platforms** (15 minutes)
   ```bash
   # Check per-platform performance
   curl https://ai-affiliate-empire.fly.dev/api/analytics/revenue/by-platform

   # Identify which platform's revenue dropped
   ```

4. **Review Recent Changes** (15 minutes)
   - Recent content changes?
   - Prompt modifications?
   - Product selection changes?
   - Publishing schedule changes?

5. **Action Plan** (next day)
   - A/B test new content strategies
   - Adjust product selection
   - Optimize publishing times
   - Review and improve content quality

---

## Info Alerts

### DailyMetricsSummary

**Alert Definition:**
```yaml
- alert: DailyMetricsSummary
  expr: hour() == 9  # 9 AM
  labels:
    severity: info
  annotations:
    summary: "Daily metrics summary"
    description: "Review daily performance metrics"
```

**Response Procedure:**

1. **Review Dashboard** (10 minutes)
   - Check Grafana System Overview
   - Review Cost Tracking
   - Check Performance metrics

2. **Generate Report** (5 minutes)
   ```bash
   curl https://ai-affiliate-empire.fly.dev/api/analytics/daily-summary
   ```

3. **Share with Team** (5 minutes)
   - Post summary to Slack/Discord
   - Highlight any anomalies
   - Note action items

---

## False Positive Handling

### Identifying False Positives

1. **Check Alert History**
   - Has this alert fired frequently?
   - Does it always resolve itself?
   - Is there actual impact?

2. **Verify Impact**
   - Are users affected?
   - Is functionality broken?
   - Are metrics actually degraded?

3. **Review Alert Threshold**
   - Is threshold too sensitive?
   - Does baseline vary naturally?
   - Is duration too short?

### Tuning Alert Thresholds

```yaml
# Example: Adjust threshold
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 5m  # Increase from 2m to 5m to reduce false positives
```

**Process:**
1. Document false positive
2. Analyze baseline metrics
3. Propose new threshold
4. Get team approval
5. Update alert rule
6. Monitor for improvement

---

## Alert Tuning Guidelines

### When to Adjust Thresholds

✅ **Increase threshold if:**
- Alert fires frequently without real impact
- Baseline metrics naturally exceed threshold
- Team has alert fatigue
- Alert provides low value

❌ **Don't adjust if:**
- Alert indicates real issues that need fixing
- Infrastructure improvements would prevent alert
- Alert is catching real regressions

### Tuning Process

1. **Collect Data** (1 week)
   - Record all alert firings
   - Note false vs true positives
   - Measure baseline metrics

2. **Analyze** (1 day)
   - Calculate p95/p99 of baseline
   - Identify natural variation
   - Determine appropriate threshold

3. **Propose Change** (team review)
   - Document current vs proposed threshold
   - Explain reasoning
   - Get team consensus

4. **Implement** (5 minutes)
   ```yaml
   # Update alert in monitoring/prometheus/alerts.yml
   # Commit and deploy
   ```

5. **Monitor** (2 weeks)
   - Track alert frequency
   - Ensure catching real issues
   - Adjust if needed

---

## Escalation Procedures

### When to Escalate

**Immediate Escalation (Critical):**
- Cannot resolve in 15 minutes
- Multiple critical alerts firing
- Data loss risk
- Security incident

**Escalate After 30 Minutes (High):**
- Cannot identify root cause
- Mitigation not working
- Need specialized expertise

**Escalate After 4 Hours (Warning):**
- Cannot resolve alone
- Need architecture decision
- Requires significant code change

### Escalation Contacts

**Primary On-Call:**
- Check PagerDuty schedule
- Slack/Discord: @oncall

**Secondary On-Call:**
- Check PagerDuty schedule
- Slack/Discord: @oncall-secondary

**Engineering Manager:**
- [Name]
- [Phone]
- [Email]

**Infrastructure Team:**
- Slack: #infrastructure
- Email: infra@company.com

---

## Related Runbooks

- [Incident Response](./incident-response.md) - Incident procedures
- [Database Issues](./database-issues.md) - Database problems
- [Performance Degradation](./performance-degradation.md) - Performance issues
- [Cost Management](./cost-management.md) - Cost optimization
- [Security Incidents](./security-incidents.md) - Security alerts

---

## Appendix: Alert Quick Reference

| Alert | Severity | Response Time | Typical Cause | Quick Fix |
|-------|----------|---------------|---------------|-----------|
| ServiceDown | Critical | < 5 min | Deployment/Crash | Rollback/Restart |
| HighErrorRate | Critical | < 5 min | API failure/Bad deploy | Rollback/Enable mock |
| DatabaseConnectionFailure | Critical | < 5 min | Pool exhausted/DB down | Kill connections/Restart DB |
| HighApiCosts | High | < 15 min | Runaway workflow | Pause workflows |
| HighWorkflowFailureRate | High | < 15 min | API limits/Bad data | Fix validation/Backoff |
| HighMemoryUsage | High | < 15 min | Memory leak | Restart/Scale up |
| NoProductsSynced | Warning | < 1 hour | API down/Auth expired | Refresh tokens |
| NoVideosGenerated | Warning | < 1 hour | AI service down | Enable mock/Wait |
| RevenueDeclining | Warning | Next day | Algorithm change/Content | A/B test/Optimize |

---

**Document Version**: 1.0
**Last Tested**: 2025-10-31
**Next Review**: 2025-11-30
