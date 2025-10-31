# Incident Response Runbook

**Last Updated**: 2025-10-31
**Owner**: DevOps/SRE Team
**Review Cycle**: Quarterly

## Overview

This runbook defines incident response procedures for AI Affiliate Empire production environments. Follow priority levels and response times strictly to minimize impact.

---

## Incident Priority Levels

### P0: Complete System Outage
**Definition**: Entire system unavailable, no users can access services
**Response Time**: < 5 minutes
**Examples**: All instances down, database unreachable, DNS failure

### P1: Critical Feature Broken
**Definition**: Core revenue-generating feature unavailable
**Response Time**: < 15 minutes
**Examples**: Content generation failed, publishing broken, affiliate tracking down

### P2: Degraded Performance
**Definition**: System operational but significantly impaired
**Response Time**: < 1 hour
**Examples**: Slow response times, partial service failure, elevated error rates

### P3: Minor Issues
**Definition**: Minor bugs or non-critical feature issues
**Response Time**: < 4 hours
**Examples**: Dashboard UI glitches, non-critical workflow delays, logging issues

---

## P0: Complete System Outage

### Initial Response (0-5 minutes)

#### 1. Confirm Incident
```bash
# Check primary endpoint
curl -I https://ai-affiliate-empire.fly.dev/health
# Expected: HTTP 200 OK

# Check multiple health endpoints
curl https://ai-affiliate-empire.fly.dev/health/ready
curl https://ai-affiliate-empire.fly.dev/health/live

# Check DNS resolution
dig ai-affiliate-empire.fly.dev

# Check from multiple locations
# Use: https://downforeveryoneorjustme.com
```

**If confirmed down:**
- Page on-call engineer immediately
- Update status page: "Investigating major outage"
- Post in #incidents Slack/Discord channel

#### 2. Gather Initial Information
```bash
# Check service status
flyctl status --app ai-affiliate-empire

# Check recent deployments
flyctl releases list --app ai-affiliate-empire

# View error logs
flyctl logs --app ai-affiliate-empire | tail -100

# Check infrastructure alerts
# - Sentry dashboard
# - Grafana alerts
# - Fly.io status page
```

#### 3. Quick Triage

**Common Causes:**
1. **Recent deployment failure** → Initiate rollback
2. **Database outage** → Check database status
3. **Infrastructure issue** → Check Fly.io status
4. **DNS/Network issue** → Check DNS and CDN
5. **Resource exhaustion** → Check CPU/memory

### Investigation & Mitigation (5-30 minutes)

#### Scenario A: Recent Deployment Failure

**Indicators:**
- Deployment completed < 30 minutes ago
- Health checks failing since deployment
- Error logs showing new errors

**Action:**
```bash
# Immediate rollback
./scripts/rollback.sh production

# Monitor rollback
flyctl status --app ai-affiliate-empire
watch -n 5 'curl -I https://ai-affiliate-empire.fly.dev/health'

# Verify services recovering
flyctl logs --app ai-affiliate-empire -f
```

**Communication:**
```
Status: Investigating deployment-related outage
Action: Rolling back to previous stable version
ETA: 5-10 minutes
```

#### Scenario B: Database Outage

**Indicators:**
- Connection timeout errors
- "Cannot connect to database" in logs
- Database instance unreachable

**Action:**
```bash
# Check database status
flyctl postgres status --app ai-affiliate-empire-db

# Check connection pool
flyctl postgres connect --app ai-affiliate-empire-db
SELECT count(*) FROM pg_stat_activity;
\q

# If database is down, restart
flyctl postgres restart --app ai-affiliate-empire-db

# If connection pool exhausted
flyctl ssh console --app ai-affiliate-empire
# Kill idle connections (in psql)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < current_timestamp - INTERVAL '10 minutes';

# Restart application to reset connections
flyctl apps restart ai-affiliate-empire
```

**Communication:**
```
Status: Database connectivity issue identified
Action: Restarting database services
ETA: 5-15 minutes
```

#### Scenario C: Infrastructure Provider Issue

**Indicators:**
- Multiple services down simultaneously
- Fly.io status page showing issues
- No recent deployments or changes

**Action:**
```bash
# Check Fly.io status
# Visit: https://status.fly.io

# If provider issue confirmed:
# 1. Monitor provider status page
# 2. Prepare for potential failover
# 3. Communicate externally

# If prolonged (>30 min), consider emergency migration
# See: disaster-recovery.md (if exists)
```

**Communication:**
```
Status: Infrastructure provider experiencing issues
Action: Monitoring provider resolution
Impact: Service unavailable, no data loss
Updates: Every 15 minutes
```

#### Scenario D: Resource Exhaustion

**Indicators:**
- OOMKilled in logs
- CPU at 100%
- Instances crashing/restarting

**Action:**
```bash
# Check resource usage
flyctl metrics --app ai-affiliate-empire

# Scale up immediately
flyctl scale vm shared-cpu-2x --app ai-affiliate-empire
flyctl scale count 3 --app ai-affiliate-empire

# Identify resource hog
flyctl logs --app ai-affiliate-empire | grep -i "memory\|cpu"

# Check for memory leaks
flyctl ssh console --app ai-affiliate-empire
node --expose-gc -e 'console.log(process.memoryUsage())'
```

**Communication:**
```
Status: Resource exhaustion identified
Action: Scaling resources, investigating root cause
ETA: Services recovering in 5 minutes
```

### Resolution & Recovery

#### 1. Verify Service Restoration
```bash
# Run smoke tests
npm run test:smoke:production

# Check all health endpoints
curl https://ai-affiliate-empire.fly.dev/health
curl https://ai-affiliate-empire.fly.dev/health/ready
curl https://ai-affiliate-empire.fly.dev/health/services

# Monitor error rates
# Check Sentry dashboard
# Check Grafana for error metrics

# Verify critical workflows
flyctl ssh console --app ai-affiliate-empire
npm run workflow:check
```

#### 2. Update Communications
```
Status: Services restored
Resolution: [Specific action taken]
Impact Duration: [Time from start to resolution]
Next Steps: Root cause analysis in progress
```

#### 3. Initial Documentation
Create incident ticket with:
- Timeline of events
- Actions taken
- Services affected
- Customer impact
- Preliminary root cause

---

## P1: Critical Feature Broken

### Response Procedure (0-15 minutes)

#### 1. Identify Broken Feature
```bash
# Check workflow status
# Access Temporal UI: http://localhost:8233 or Fly.io equivalent

# Check specific workflows
curl https://ai-affiliate-empire.fly.dev/api/workflows/status

# Check publishing success rates
curl https://ai-affiliate-empire.fly.dev/api/analytics/publishing/stats

# Check content generation
curl https://ai-affiliate-empire.fly.dev/api/content/generation/stats
```

#### 2. Assess Impact
- Which feature is broken?
- How many users/workflows affected?
- Is revenue generation impacted?
- Are there workarounds available?

#### 3. Quick Mitigation

**Scenario: Content Generation Failing**

```bash
# Check API keys validity
flyctl secrets list --app ai-affiliate-empire

# Check API service status
curl https://api.openai.com/v1/models  # OpenAI
curl https://api.anthropic.com/v1/messages  # Claude

# Check error patterns
flyctl logs --app ai-affiliate-empire | grep -i "generation\|openai\|anthropic"

# If API issue, enable fallback
flyctl secrets set ENABLE_MOCK_MODE=true --app ai-affiliate-empire

# Or switch to backup API key
flyctl secrets set OPENAI_API_KEY=sk-backup-key --app ai-affiliate-empire
```

**Scenario: Publishing Failed**

```bash
# Check platform API status
# YouTube: https://www.google.com/appsstatus
# TikTok: Check developer portal
# Instagram: https://developers.facebook.com/status

# Check OAuth tokens
flyctl ssh console --app ai-affiliate-empire
npm run auth:check

# Refresh expired tokens
npm run auth:refresh:all

# Check rate limits
flyctl logs --app ai-affiliate-empire | grep -i "rate limit"
```

**Scenario: Affiliate Tracking Down**

```bash
# Check database connectivity
flyctl postgres connect --app ai-affiliate-empire-db
SELECT COUNT(*) FROM analytics_events WHERE created_at > NOW() - INTERVAL '1 hour';

# Check webhook endpoints
curl -X POST https://ai-affiliate-empire.fly.dev/api/webhooks/test

# Verify tracking codes
flyctl ssh console --app ai-affiliate-empire
npm run tracking:verify
```

### Resolution

1. **Implement fix** (code change, configuration, or workaround)
2. **Deploy fix** (if code change required)
3. **Verify resolution** (test affected feature)
4. **Monitor** for 30 minutes
5. **Document** incident and resolution

---

## P2: Degraded Performance

### Response Procedure (0-60 minutes)

#### 1. Identify Performance Issue
```bash
# Check response times
curl -w "@curl-format.txt" -s -o /dev/null https://ai-affiliate-empire.fly.dev/health

# curl-format.txt contents:
# time_namelookup: %{time_namelookup}
# time_connect: %{time_connect}
# time_starttransfer: %{time_starttransfer}
# time_total: %{time_total}

# Check Grafana performance dashboard
# Access: Grafana → AI Affiliate Empire - Performance

# Check slow queries
flyctl postgres connect --app ai-affiliate-empire-db
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### 2. Common Performance Issues

**High Database Latency:**
```bash
# Check active queries
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start;

# Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
AND query_start < NOW() - INTERVAL '5 minutes';

# Vacuum and analyze
VACUUM ANALYZE;

# Check indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```

**High CPU Usage:**
```bash
# Identify CPU hogs
flyctl ssh console --app ai-affiliate-empire
top

# Check Node.js profiling
node --prof app.js

# Scale horizontally
flyctl scale count 3 --app ai-affiliate-empire
```

**Memory Leaks:**
```bash
# Monitor memory over time
flyctl metrics --app ai-affiliate-empire

# Generate heap snapshot
flyctl ssh console --app ai-affiliate-empire
node --inspect app.js
# Use Chrome DevTools to capture heap snapshot

# Restart affected instances
flyctl apps restart ai-affiliate-empire
```

#### 3. Mitigation Actions

1. **Immediate**: Scale resources if needed
2. **Short-term**: Implement caching, optimize queries
3. **Long-term**: Code optimization, architecture changes

---

## P3: Minor Issues

### Response Procedure (0-4 hours)

#### 1. Triage
- Confirm impact is minimal
- Document the issue
- Assign to appropriate team member

#### 2. Standard Debugging
```bash
# Collect logs
flyctl logs --app ai-affiliate-empire > issue-logs.txt

# Check recent changes
git log --since="1 day ago" --oneline

# Review Sentry for related errors
# Access Sentry dashboard

# Test locally if possible
docker-compose up
npm run test
```

#### 3. Resolution
- Create fix in development branch
- Test thoroughly
- Deploy during next maintenance window
- Document in changelog

---

## Incident Communication Template

### Initial Notification (Within response time SLA)

```
🚨 INCIDENT ALERT - [P0/P1/P2/P3]

Title: [Brief description]
Status: Investigating
Impact: [User-facing impact]
Started: [Timestamp]
ETA: [Estimated resolution time]

Current Actions:
- [Action 1]
- [Action 2]

Next Update: [Time]
```

### Progress Update (Every 15-30 minutes)

```
📊 INCIDENT UPDATE - [P0/P1/P2/P3]

Title: [Brief description]
Status: [Investigating/Mitigating/Monitoring]
Impact: [Current impact level]
Duration: [Time since start]

Actions Taken:
- [Completed action 1]
- [Completed action 2]

Current Focus:
- [Current action]

Next Update: [Time]
```

### Resolution Notification

```
✅ INCIDENT RESOLVED - [P0/P1/P2/P3]

Title: [Brief description]
Status: Resolved
Impact Duration: [Total time]
Resolution: [What fixed it]

Root Cause: [Brief explanation]
Prevention: [Steps to prevent recurrence]

Post-Mortem: [Will be published within X days]
```

---

## Post-Incident Activities

### Immediate (Within 24 hours)

1. **Complete incident ticket** with all details
2. **Update runbooks** if new scenarios discovered
3. **Brief team** on incident and resolution
4. **Customer communication** if customer-facing impact

### Short-term (Within 1 week)

1. **Write post-mortem** (see template below)
2. **Create action items** for prevention
3. **Update monitoring/alerts** if gaps discovered
4. **Schedule post-mortem review** with team

### Long-term (Within 1 month)

1. **Implement preventive measures**
2. **Update documentation**
3. **Conduct training** if needed
4. **Review incident trends** for patterns

---

## Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date**: [Date of incident]
**Duration**: [Start time] - [End time] ([Total duration])
**Severity**: [P0/P1/P2/P3]
**Impact**: [Description of impact]
**Responders**: [Names]

## Summary
[2-3 sentence summary of what happened]

## Timeline
| Time | Event |
|------|-------|
| HH:MM | [Event description] |
| HH:MM | [Event description] |

## Root Cause
[Detailed explanation of what caused the incident]

## What Went Well
- [Thing 1]
- [Thing 2]

## What Went Wrong
- [Thing 1]
- [Thing 2]

## Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [Action] | [Name] | [Date] | [P0-P3] |

## Lessons Learned
[Key takeaways for the team]
```

---

## Escalation Contacts

### On-Call Rotation
- **Primary**: See PagerDuty schedule
- **Secondary**: See PagerDuty schedule
- **Manager**: [Name] - [Phone] - [Email]

### External Contacts
- **Fly.io Support**: support@fly.io
- **AWS Support**: Via console (if using AWS Secrets Manager)
- **Sentry Support**: support@sentry.io

### Vendor Support (for P0/P1)
- **OpenAI**: https://platform.openai.com/support
- **Anthropic**: support@anthropic.com
- **ElevenLabs**: support@elevenlabs.io
- **Pika Labs**: support@pika.art

---

## Related Runbooks

- [Database Issues](./database-issues.md)
- [Deployment Rollback](./deployment-rollback.md)
- [Monitoring Alerts](./monitoring-alerts.md)
- [Security Incidents](./security-incidents.md)
- [Performance Degradation](./performance-degradation.md)

---

## Appendix: Quick Reference Commands

### Health Checks
```bash
# All health endpoints
curl https://ai-affiliate-empire.fly.dev/health
curl https://ai-affiliate-empire.fly.dev/health/ready
curl https://ai-affiliate-empire.fly.dev/health/live
curl https://ai-affiliate-empire.fly.dev/health/services
```

### Status Checks
```bash
# Application status
flyctl status --app ai-affiliate-empire

# Database status
flyctl postgres status --app ai-affiliate-empire-db

# Recent logs
flyctl logs --app ai-affiliate-empire | tail -50

# Resource usage
flyctl metrics --app ai-affiliate-empire
```

### Emergency Actions
```bash
# Rollback deployment
./scripts/rollback.sh production

# Restart application
flyctl apps restart ai-affiliate-empire

# Scale resources
flyctl scale vm shared-cpu-2x --app ai-affiliate-empire
flyctl scale count 3 --app ai-affiliate-empire

# Enable mock mode (emergency fallback)
flyctl secrets set ENABLE_MOCK_MODE=true --app ai-affiliate-empire
```

---

**Document Version**: 1.0
**Last Tested**: 2025-10-31
**Next Review**: 2026-01-31
