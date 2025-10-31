# Security Incidents Runbook

**Last Updated**: 2025-10-31
**Owner**: Security/DevOps Team
**Review Cycle**: Quarterly
**Classification**: CONFIDENTIAL

## Overview

Incident response procedures for security events in AI Affiliate Empire. All security incidents must be reported immediately and handled with utmost confidentiality.

---

## Security Incident Classification

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P0 - Critical** | Active breach, data exposed | < 15 minutes | Database breach, API keys leaked publicly |
| **P1 - High** | Potential breach, vulnerability exploited | < 1 hour | Unauthorized access attempt, suspicious activity |
| **P2 - Medium** | Security weakness identified | < 4 hours | Outdated dependencies, misconfiguration |
| **P3 - Low** | Minor security concern | < 1 day | Low-risk vulnerability, security best practice violation |

---

## P0: Critical Security Incidents

### Unauthorized Access Detected

**Indicators:**
- Unusual admin panel access from unknown IPs
- Database queries from unauthorized sources
- Unexpected API calls with valid credentials
- AWS/Fly.io console access from unknown location

**Immediate Response (< 5 minutes):**

1. **Confirm Breach**
   ```bash
   # Check recent access logs
   flyctl logs --app ai-affiliate-empire | grep -i "unauthorized\|access denied\|403\|401"

   # Check database access logs
   flyctl postgres connect --app ai-affiliate-empire-db
   SELECT * FROM pg_stat_activity;

   # Check for suspicious queries
   SELECT usename, query, state, query_start
   FROM pg_stat_activity
   WHERE usename NOT IN ('postgres', 'app_user')
   OR query LIKE '%DROP%'
   OR query LIKE '%DELETE%';
   ```

2. **Contain Breach** (< 2 minutes)
   ```bash
   # If confirmed unauthorized access:

   # Option 1: Block IP immediately
   # Via Fly.io dashboard or:
   flyctl ips block <suspicious-ip> --app ai-affiliate-empire

   # Option 2: Rotate ALL credentials
   ./scripts/emergency-credential-rotation.sh

   # Option 3: Take application offline (last resort)
   flyctl scale count 0 --app ai-affiliate-empire
   ```

3. **Revoke Access** (< 3 minutes)
   ```bash
   # Revoke all active sessions
   flyctl postgres connect --app ai-affiliate-empire-db

   # Kill all active connections
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE pid != pg_backend_pid();

   # Invalidate all auth tokens
   DELETE FROM sessions WHERE expires_at > NOW();
   ```

4. **Notify Team** (< 1 minute)
   ```bash
   # Send emergency alert
   ./.claude/send-discord.sh '🚨 SECURITY INCIDENT: Unauthorized access detected. System contained. Investigating. DO NOT share details publicly.'

   # Page security team
   # Notify management
   # DO NOT post details in public channels
   ```

5. **Preserve Evidence** (< 5 minutes)
   ```bash
   # Save all logs immediately
   flyctl logs --app ai-affiliate-empire > security-incident-$(date +%Y%m%d-%H%M%S).log

   # Export database audit logs
   flyctl postgres connect --app ai-affiliate-empire-db
   COPY (SELECT * FROM pg_stat_activity) TO '/tmp/db-activity.csv' CSV HEADER;

   # Save application state
   curl https://ai-affiliate-empire.fly.dev/api/admin/state-dump > state-$(date +%Y%m%d-%H%M%S).json
   ```

**Investigation (< 30 minutes):**

1. **Identify Entry Point**
   - Compromised credentials?
   - SQL injection?
   - XSS vulnerability?
   - Social engineering?

2. **Assess Damage**
   ```bash
   # Check what data was accessed
   flyctl postgres connect --app ai-affiliate-empire-db

   # Check for data modifications
   SELECT * FROM audit_log
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;

   # Check for data exfiltration
   # Review large SELECT queries
   SELECT query, query_start
   FROM pg_stat_activity_history
   WHERE query LIKE '%SELECT%'
   AND length(query) > 1000;
   ```

3. **Document Timeline**
   - When was breach detected?
   - When did breach likely start?
   - What actions were taken?
   - What data was compromised?

**Remediation:**

1. **Rotate All Credentials**
   ```bash
   # Rotate API keys
   flyctl secrets set \
     OPENAI_API_KEY=new-key \
     ANTHROPIC_API_KEY=new-key \
     DATABASE_URL=new-url \
     --app ai-affiliate-empire

   # Rotate database password
   flyctl postgres users password postgres --app ai-affiliate-empire-db

   # Generate new JWT secrets
   flyctl secrets set JWT_SECRET=$(openssl rand -base64 32) --app ai-affiliate-empire
   ```

2. **Patch Vulnerability**
   - Fix code vulnerability
   - Update dependencies
   - Apply security patches
   - Deploy fix immediately

3. **Restore Service** (only after secured)
   ```bash
   # Verify all credentials rotated
   # Verify vulnerability patched
   # Verify no backdoors remain

   # Scale up slowly
   flyctl scale count 1 --app ai-affiliate-empire

   # Monitor for 30 minutes
   # Check for suspicious activity

   # If clean, scale to full capacity
   flyctl scale count 2 --app ai-affiliate-empire
   ```

---

### API Key Compromise

**Indicators:**
- API key found in public GitHub repo
- Unusual API usage patterns
- Costs spike unexpectedly
- Rate limit errors from unknown sources

**Immediate Response (< 5 minutes):**

1. **Confirm Compromise**
   ```bash
   # Check API usage
   curl https://api.openai.com/v1/usage  # Check OpenAI usage

   # Check for unusual patterns
   # - Requests from unknown IPs
   # - Spike in request volume
   # - Unusual request patterns

   # Search GitHub for leaked keys
   # https://github.com/search?q=sk-proj-[YOUR_KEY]&type=code
   ```

2. **Revoke Compromised Key** (< 1 minute)
   ```bash
   # Revoke on provider side immediately
   # OpenAI: https://platform.openai.com/api-keys
   # Anthropic: https://console.anthropic.com/settings/keys
   # Others: respective dashboards

   # Generate new key
   # Update in application
   flyctl secrets set OPENAI_API_KEY=new-key --app ai-affiliate-empire
   ```

3. **Verify No Unauthorized Usage**
   ```bash
   # Check billing for unauthorized charges
   # OpenAI: https://platform.openai.com/usage
   # Anthropic: https://console.anthropic.com/billing

   # Document unauthorized usage
   # Prepare for potential dispute
   ```

4. **Scan for Other Exposed Secrets**
   ```bash
   # Scan codebase for hardcoded secrets
   npm install -g trufflehog

   trufflehog filesystem ./ \
     --json \
     --exclude-paths .trufflehog-exclude.txt \
     > secret-scan-$(date +%Y%m%d).json

   # Check git history
   git log -p | grep -i "api_key\|secret\|password" > potential-leaks.txt
   ```

**Prevention:**

1. **Remove from Public Repositories**
   ```bash
   # If key was committed to git:

   # Option 1: Use BFG Repo-Cleaner
   bfg --replace-text passwords.txt repo.git
   git push --force

   # Option 2: GitHub secret scanning
   # GitHub automatically detects and alerts on secrets
   # Respond to alerts immediately
   ```

2. **Implement Secrets Scanning**
   ```yaml
   # .github/workflows/secret-scan.yml
   name: Secret Scan
   on: [push, pull_request]
   jobs:
     scan:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: trufflesecurity/trufflehog@main
           with:
             path: ./
             base: main
             head: HEAD
   ```

3. **Use Secrets Manager**
   ```bash
   # Migrate to AWS Secrets Manager
   npm run migrate:secrets

   # Enable in production
   flyctl secrets set AWS_SECRETS_MANAGER_ENABLED=true --app ai-affiliate-empire
   ```

---

### Data Breach Response

**Indicators:**
- Database dump found publicly
- Customer data accessed without authorization
- Data exfiltration detected
- Compliance violation reported

**Immediate Response (< 15 minutes):**

1. **Confirm Breach**
   ```bash
   # Check what data was exposed
   # - User data?
   # - Financial data?
   # - API credentials?
   # - Affiliate links/tracking data?

   # Determine scope
   # - How many records?
   # - What sensitivity level?
   # - How was it accessed?
   ```

2. **Contain Breach**
   ```bash
   # Stop data exfiltration
   flyctl ips block <attacker-ip> --app ai-affiliate-empire

   # Lock down database
   flyctl postgres connect --app ai-affiliate-empire-db

   # Revoke public access (if any)
   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;

   # Restrict to application only
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   ```

3. **Legal Notification** (CRITICAL)
   ```bash
   # Immediately notify:
   # - Legal counsel
   # - Compliance officer
   # - Data protection officer (if applicable)

   # Determine breach notification requirements:
   # - GDPR: 72 hours
   # - CCPA: Without unreasonable delay
   # - Other jurisdictions as applicable
   ```

4. **Preserve Evidence**
   ```bash
   # Full database snapshot
   flyctl postgres backup create --app ai-affiliate-empire-db

   # Export affected records
   flyctl postgres connect --app ai-affiliate-empire-db
   COPY (SELECT * FROM affected_table WHERE ...) TO '/tmp/breach-data.csv' CSV HEADER;

   # Save all logs
   flyctl logs --app ai-affiliate-empire --all > full-breach-logs.txt
   ```

**Remediation:**

1. **Assess Impact**
   - Number of affected users/records
   - Type of data compromised
   - Potential harm to individuals
   - Regulatory implications

2. **Notification Plan**
   ```
   Timeline:
   - T+0: Confirm breach
   - T+24h: Notify legal/compliance
   - T+48h: Draft notification (if required)
   - T+72h: Notify authorities (GDPR)
   - T+1 week: Notify affected users

   Notification Content:
   - What happened
   - What data was affected
   - What we're doing
   - What users should do
   - Contact information
   ```

3. **Post-Breach Security Audit**
   - Full security assessment
   - Penetration testing
   - Code review
   - Infrastructure audit

---

## P1: High Priority Security Incidents

### DDoS Attack

**Indicators:**
- Sudden traffic spike (10x+ normal)
- Same endpoints hit repeatedly
- Traffic from single IP or botnet
- Service degradation/downtime

**Response:**

1. **Confirm Attack**
   ```bash
   # Check traffic patterns
   flyctl metrics --app ai-affiliate-empire

   # Check access logs
   flyctl logs --app ai-affiliate-empire | grep -i "GET\|POST" | wc -l

   # Identify attack pattern
   flyctl logs --app ai-affiliate-empire | awk '{print $1}' | sort | uniq -c | sort -rn | head -20
   ```

2. **Enable Rate Limiting**
   ```bash
   # If not already enabled
   flyctl secrets set RATE_LIMIT_ENABLED=true --app ai-affiliate-empire
   flyctl secrets set RATE_LIMIT_MAX=100 --app ai-affiliate-empire
   ```

3. **Block Attack Sources**
   ```bash
   # Block individual IPs
   flyctl ips block <attacker-ip> --app ai-affiliate-empire

   # For large botnet, use Cloudflare
   # Enable "I'm Under Attack" mode
   # Cloudflare will challenge all requests
   ```

4. **Scale to Handle Load** (if needed)
   ```bash
   flyctl scale count 5 --app ai-affiliate-empire
   flyctl scale vm dedicated-cpu-1x --app ai-affiliate-empire
   ```

---

### Suspicious Activity

**Indicators:**
- Failed login attempts (brute force)
- Unusual API endpoints accessed
- Privilege escalation attempts
- Scanning/reconnaissance activity

**Response:**

1. **Monitor and Log**
   ```bash
   # Enable detailed logging
   flyctl secrets set LOG_LEVEL=debug --app ai-affiliate-empire

   # Monitor suspicious IPs
   flyctl logs --app ai-affiliate-empire | grep <suspicious-ip>
   ```

2. **Implement IP Blocking**
   ```bash
   # Block after 10 failed attempts
   # Automatic via fail2ban or similar

   # Manual block
   flyctl ips block <ip> --app ai-affiliate-empire
   ```

3. **Review Access Controls**
   ```bash
   # Ensure admin endpoints require auth
   # Verify JWT validation working
   # Check for exposed debug endpoints
   ```

---

## P2-P3: Medium/Low Priority

### Outdated Dependencies

**Response:**
```bash
# Check for vulnerabilities
npm audit

# Fix automatically if possible
npm audit fix

# For breaking changes, update manually
npm update package-name

# Test thoroughly before deploying
npm test
npm run test:e2e
```

### Security Misconfiguration

**Common Issues:**
- CORS misconfiguration
- Missing security headers
- Debug mode enabled in production
- Excessive permissions

**Response:**
```bash
# Check security headers
curl -I https://ai-affiliate-empire.fly.dev

# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000

# Fix in code, deploy update
```

---

## Security Audit Procedures

### Weekly Security Checks

```bash
# 1. Dependency audit
npm audit

# 2. Container scan
docker scan ai-affiliate-empire:latest

# 3. Secret scan
trufflehog filesystem ./

# 4. Access log review
flyctl logs --app ai-affiliate-empire | grep -i "403\|401\|failed"

# 5. Failed authentication attempts
curl https://ai-affiliate-empire.fly.dev/api/admin/security/failed-logins
```

### Monthly Security Review

1. Review all access permissions
2. Rotate credentials
3. Update dependencies
4. Review security logs
5. Test backup restoration
6. Review and update runbooks

### Quarterly Penetration Testing

1. Engage security firm or internal team
2. Test all endpoints
3. Attempt privilege escalation
4. Test data access controls
5. Document findings
6. Remediate vulnerabilities
7. Re-test after fixes

---

## Security Hardening Checklist

### Application Security

- [ ] All endpoints require authentication
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting on all public endpoints
- [ ] Security headers configured
- [ ] HTTPS only (no HTTP)
- [ ] Secrets in Secrets Manager (not env vars)
- [ ] Regular dependency updates

### Database Security

- [ ] Strong passwords (32+ characters)
- [ ] SSL connections only
- [ ] Least privilege access
- [ ] Regular backups
- [ ] Audit logging enabled
- [ ] No public access
- [ ] Row-level security where needed

### Infrastructure Security

- [ ] MFA on all accounts
- [ ] IAM roles (not access keys)
- [ ] Private networks for internal services
- [ ] Firewall rules configured
- [ ] Monitoring and alerting
- [ ] Regular security patches
- [ ] Encrypted backups

---

## Incident Communication Template

### Internal Communication (Private Channel)

```
🔒 SECURITY INCIDENT - [P0/P1/P2/P3]

Classification: [Type of incident]
Severity: [P0-P3]
Status: [Investigating/Contained/Resolved]
Started: [Timestamp]

Details: [Brief, factual description]

Actions Taken:
- [Action 1]
- [Action 2]

Impact: [What's affected]

Next Steps:
- [Next action]

Lead: [Person's name]
DO NOT share outside this channel.
```

### External Communication (If Required)

```
Security Notice - [Date]

We recently became aware of [incident description].

What Happened:
[Factual description]

What Information Was Involved:
[Specific data types]

What We're Doing:
[Actions taken and planned]

What You Can Do:
[User recommendations]

Questions:
[Contact information]
```

---

## Regulatory Compliance

### GDPR Requirements

**Breach Notification Timeline:**
- 72 hours to notify supervisory authority
- Without undue delay to notify affected individuals

**Required Information:**
- Nature of breach
- Categories and approximate number of data subjects
- Likely consequences
- Measures taken to address breach

### CCPA Requirements

**Breach Notification:**
- Without unreasonable delay
- Notify Attorney General if > 500 California residents

---

## Related Runbooks

- [Incident Response](./incident-response.md) - General incident procedures
- [Monitoring Alerts](./monitoring-alerts.md) - Security alerts
- [Deployment Rollback](./deployment-rollback.md) - Emergency rollback

---

## Emergency Contacts

**Internal:**
- Security Lead: [Name] - [Phone]
- Legal Counsel: [Name] - [Phone]
- Compliance Officer: [Name] - [Phone]

**External:**
- Security Firm: [Company] - [Phone]
- Legal Firm: [Company] - [Phone]
- Law Enforcement: [Local cybercrime unit]

**Vendors:**
- Fly.io Support: support@fly.io
- AWS Support: Via console
- GitHub Security: security@github.com

---

**Document Version**: 1.0
**Classification**: CONFIDENTIAL
**Last Tested**: 2025-10-31
**Next Review**: 2026-01-31
