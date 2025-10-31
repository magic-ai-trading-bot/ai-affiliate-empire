# Production Runbooks

**Owner**: DevOps/SRE Team
**Last Updated**: 2025-10-31

## Overview

Operational runbooks for AI Affiliate Empire production support. Each runbook provides step-by-step procedures for handling specific operational scenarios.

---

## Quick Reference

### Emergency Contacts

- **Primary On-Call**: Check PagerDuty schedule
- **Secondary On-Call**: Check PagerDuty schedule
- **Engineering Manager**: [Name] - [Phone]
- **Security Lead**: [Name] - [Phone]

### Critical Commands

```bash
# Health check
curl https://ai-affiliate-empire.fly.dev/health

# Application status
flyctl status --app ai-affiliate-empire

# Recent logs
flyctl logs --app ai-affiliate-empire | tail -50

# Emergency rollback
./scripts/rollback.sh production

# Stop all workflows (emergency)
curl -X POST https://ai-affiliate-empire.fly.dev/api/workflows/emergency-stop
```

---

## Available Runbooks

### 1. [Incident Response](./incident-response.md)
**Use when**: System outage, critical feature broken, or any production emergency

**Priority Levels**:
- **P0**: Complete system outage (< 5 min response)
- **P1**: Critical feature broken (< 15 min response)
- **P2**: Degraded performance (< 1 hour response)
- **P3**: Minor issues (< 4 hours response)

**Key Procedures**:
- System outage response
- Critical feature failure handling
- Incident communication templates
- Post-mortem templates

---

### 2. [Database Issues](./database-issues.md)
**Use when**: Database performance problems, connection issues, or data integrity concerns

**Covers**:
- Connection pool exhausted
- Slow queries identification and optimization
- Database backup and restore
- Migration rollback procedures
- Data corruption recovery
- Performance degradation analysis

**Quick Fixes**:
```bash
# Connection pool exhausted
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';

# Slow queries
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# Performance tune
VACUUM ANALYZE;
```

---

### 3. [Deployment Rollback](./deployment-rollback.md)
**Use when**: Failed deployment, broken release, or need to revert changes

**When to Rollback**:
- Health checks failing after deployment
- Error rate > 5% within 5 minutes
- Critical feature completely broken
- Database corruption detected

**Procedures**:
- Automated rollback (recommended)
- Manual rollback steps
- Database rollback considerations
- Post-rollback verification

**Quick Command**:
```bash
./scripts/rollback.sh production
```

---

### 4. [Monitoring Alerts](./monitoring-alerts.md)
**Use when**: Any monitoring alert fires

**Alert Categories**:
- **Critical**: ServiceDown, HighErrorRate, DatabaseConnectionFailure
- **High**: HighApiCosts, HighWorkflowFailureRate, HighMemoryUsage
- **Warning**: NoProductsSynced, NoVideosGenerated, RevenueDeclining
- **Info**: DailyMetricsSummary

**Response Templates**:
- Step-by-step procedures for each alert
- Escalation procedures
- Alert tuning guidelines
- False positive handling

---

### 5. [Cost Management](./cost-management.md)
**Use when**: Budget concerns, cost spikes, or optimization needed

**Target Monthly Cost**: $412
- Fixed: $177 (Pika, ElevenLabs, Fly.io)
- Variable: $235 (OpenAI, Anthropic, DALL-E)

**Key Procedures**:
- Daily cost monitoring
- Budget alert response
- Cost optimization strategies
- Emergency cost controls
- API usage auditing

**Quick Checks**:
```bash
# Today's costs
curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/today

# Cost breakdown
curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/breakdown
```

---

### 6. [Security Incidents](./security-incidents.md)
**Use when**: Security breach, unauthorized access, or data exposure

**Classification**: CONFIDENTIAL

**Incident Types**:
- **P0**: Active breach, data exposed (< 15 min response)
- **P1**: Potential breach, vulnerability exploited (< 1 hour)
- **P2**: Security weakness identified (< 4 hours)
- **P3**: Minor security concern (< 1 day)

**Key Scenarios**:
- Unauthorized access detected
- API key compromise
- Data breach response
- DDoS attack mitigation
- Security audit procedures

**Emergency Actions**:
```bash
# Block suspicious IP
flyctl ips block <ip> --app ai-affiliate-empire

# Rotate all credentials
./scripts/emergency-credential-rotation.sh

# Stop application (last resort)
flyctl scale count 0 --app ai-affiliate-empire
```

---

### 7. [Performance Degradation](./performance-degradation.md)
**Use when**: Slow response times, high resource usage, or degraded service

**Performance Targets**:
- Response time p95: < 3 seconds
- CPU usage: < 70%
- Memory usage: < 85%
- Event loop lag: < 50ms

**Key Topics**:
- Identifying bottlenecks (CPU, memory, database)
- Database query optimization
- Load balancing adjustments
- Horizontal scaling procedures
- Caching optimization
- External API performance

**Quick Diagnostics**:
```bash
# Performance health check
./scripts/performance-check.sh

# Check metrics
flyctl metrics --app ai-affiliate-empire

# Database slow queries
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

---

### 8. [Backup & Restore](./backup-restore.md)
**Use when**: Data recovery needed, disaster recovery, or restore testing

**Backup Schedule**:
- Hourly (24 hour retention)
- Daily (30 day retention)
- Weekly (12 week retention)
- Monthly (12 month retention)

**Key Procedures**:
- Daily backup verification
- Point-in-time restore
- Testing restore in staging
- Disaster recovery scenarios
- Media file backups

**Quick Commands**:
```bash
# List backups
flyctl postgres backups list --app ai-affiliate-empire-db

# Create manual backup
flyctl postgres backup create --app ai-affiliate-empire-db

# Restore from backup
flyctl postgres backup restore <backup-id> --app ai-affiliate-empire-db
```

---

## Runbook Usage Guidelines

### Before Using a Runbook

1. **Read the overview** - Understand what the runbook covers
2. **Verify prerequisites** - Ensure you have necessary access and tools
3. **Assess severity** - Choose appropriate priority/response time
4. **Notify team** - Alert relevant team members if high priority

### During Incident Response

1. **Follow procedures sequentially** - Don't skip steps unless explicitly safe
2. **Document actions** - Note what you do and when
3. **Preserve evidence** - Save logs before making changes
4. **Communicate updates** - Keep team informed of progress
5. **Escalate when needed** - Don't hesitate to get help

### After Incident Resolution

1. **Complete documentation** - Fill in incident details
2. **Update runbook** - Note any deviations or improvements
3. **Write post-mortem** - Document learnings
4. **Implement preventive measures** - Fix root causes
5. **Share knowledge** - Educate team on findings

---

## Runbook Maintenance

### Review Schedule

- **Weekly**: Review any runbooks used during the week
- **Monthly**: Rotate through all runbooks for accuracy review
- **Quarterly**: Full audit and update cycle
- **After incidents**: Update based on learnings

### Update Process

1. Identify needed changes
2. Create update proposal
3. Get team review
4. Test procedures (if applicable)
5. Update runbook
6. Announce changes to team

### Testing Procedures

- **Monthly**: Test one runbook procedure in staging
- **Quarterly**: Full disaster recovery drill
- **Annually**: Complete runbook validation

---

## Training & Onboarding

### New Team Member Checklist

- [ ] Read all runbooks overview sections
- [ ] Review incident response procedures
- [ ] Practice rollback procedure in staging
- [ ] Test backup restore in staging
- [ ] Shadow on-call rotation
- [ ] Participate in disaster recovery drill

### Recommended Reading Order

1. Incident Response (understand priorities)
2. Monitoring Alerts (know what alerts mean)
3. Deployment Rollback (common procedure)
4. Database Issues (frequent scenarios)
5. Performance Degradation (optimization)
6. Security Incidents (awareness)
7. Cost Management (budget consciousness)
8. Backup & Restore (disaster recovery)

---

## Related Documentation

- [System Architecture](../system-architecture.md) - How the system works
- [Deployment Guide](../deployment-guide.md) - Deployment procedures
- [Monitoring Guide](../monitoring-guide.md) - Monitoring setup
- [Production Best Practices](../production-best-practices.md) - General best practices

---

## Feedback & Improvements

**Have suggestions for runbook improvements?**
- Create issue in repository
- Discuss in #devops channel
- Propose changes via pull request

**Found a gap or issue?**
- Report immediately to on-call
- Document in incident post-mortem
- Add to runbook improvement backlog

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-31 | Initial runbook creation | DevOps Team |

---

**Last Updated**: 2025-10-31
**Next Review**: 2025-11-30
**Maintained By**: DevOps/SRE Team
