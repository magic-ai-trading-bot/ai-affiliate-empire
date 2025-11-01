# Cost Management Runbook

**Last Updated**: 2025-10-31
**Owner**: Finance/DevOps Team
**Review Cycle**: Monthly

## Overview

Procedures for monitoring, analyzing, and optimizing operational costs for AI Affiliate Empire. Target monthly cost: $412 with revenue goal of $10,000+ (2,426% ROI).

---

## Cost Structure

### Fixed Costs: $177/month

| Service | Cost | Purpose |
|---------|------|---------|
| Pika Labs | $28/month | Video generation (2000 videos/month) |
| ElevenLabs | $99/month | Voice synthesis (unlimited) |
| Fly.io | $50/month (est) | Hosting + Database |
| **Total Fixed** | **$177** | |

### Variable Costs: $235/month (target)

| Service | Cost/Unit | Monthly Target | Total |
|---------|-----------|----------------|-------|
| OpenAI (GPT-4 Turbo) | $0.10/script | 1500 scripts | $150 |
| Anthropic (Claude) | $0.05/post | 500 posts | $25 |
| DALL-E 3 | $0.04/image | 1500 images | $60 |
| **Total Variable** | | | **$235** |

### Total Operating Cost: $412/month

---

## Daily Cost Monitoring

### Daily Cost Check

```bash
# Check today's costs
curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/today

# Example output:
# {
#   "date": "2025-10-31",
#   "total": 14.25,
#   "breakdown": {
#     "openai": 5.20,
#     "anthropic": 0.85,
#     "dalle": 2.40,
#     "elevenlabs": 3.20,
#     "pika": 0.93,
#     "fly_io": 1.67
#   }
# }

# Check month-to-date
curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/month

# Check Grafana Cost Dashboard
# Access: Grafana → AI Affiliate Empire - Cost Tracking
```

### Daily Cost Targets

| Day of Month | Target MTD Cost | Alert If Exceeds |
|--------------|-----------------|------------------|
| 5 | $68 | $75 |
| 10 | $137 | $150 |
| 15 | $206 | $225 |
| 20 | $275 | $300 |
| 25 | $343 | $375 |
| 30 | $412 | $450 |

### Daily Monitoring Routine

1. **Check Dashboard** (5 minutes)
   - Access Grafana Cost Dashboard
   - Review total costs vs target
   - Identify any cost spikes

2. **Review Service Breakdown** (5 minutes)
   ```bash
   # Get detailed breakdown
   curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/breakdown

   # Check for anomalies
   # - OpenAI > $5/day → Investigate
   # - Anthropic > $1/day → Investigate
   # - DALL-E > $2.50/day → Investigate
   ```

3. **Compare to Baseline** (5 minutes)
   - Compare to same day previous week
   - Check for unusual patterns
   - Identify trends

4. **Document Findings** (if needed)
   - Note any anomalies
   - Create tickets for investigation
   - Update cost tracking spreadsheet

---

## Budget Alert Response

### Alert: DailyCostHigh

**Trigger**: Daily costs exceed $15 (target: $13.73)

**Response Procedure:**

1. **Verify Alert** (2 minutes)
   ```bash
   # Check actual costs
   curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/today

   # Compare to target
   # Target: ~$13.73/day
   # Alert threshold: $15/day
   ```

2. **Identify Cost Driver** (10 minutes)
   ```bash
   # Get service breakdown
   curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/breakdown | jq '.'

   # Check API call volumes
   curl https://ai-affiliate-empire.fly.dev/api/analytics/api-calls/today

   # Review recent workflows
   # Access Temporal UI
   ```

3. **Common Scenarios:**

   **Scenario A: High OpenAI Costs**
   ```bash
   # Check script generation volume
   curl https://ai-affiliate-empire.fly.dev/api/content/scripts/count/today

   # Expected: ~50 scripts/day
   # Alert if: > 75 scripts/day

   # Investigate why
   # - Workflow running too frequently?
   # - Retry loops?
   # - Manual generations?

   # Review recent prompts
   # Check average token count
   ```

   **Action:**
   ```bash
   # If temporary spike, monitor
   # If systemic issue:

   # 1. Reduce generation frequency
   # Update workflow schedule

   # 2. Optimize prompts for token efficiency
   # Reduce context size
   # Use shorter system messages

   # 3. Implement caching
   # Cache product descriptions
   # Reuse similar prompts

   # 4. Use cheaper model for drafts
   # Switch to GPT-4-turbo for initial generation
   # Use GPT-4 Turbo only for final polish
   ```

   **Scenario B: High Anthropic Costs**
   ```bash
   # Check blog post generation
   curl https://ai-affiliate-empire.fly.dev/api/content/blogs/count/today

   # Expected: ~15 posts/day
   # Alert if: > 25 posts/day

   # Action:
   # - Reduce post frequency
   # - Shorten post length
   # - Cache product research
   ```

   **Scenario C: High DALL-E Costs**
   ```bash
   # Check image generation
   curl https://ai-affiliate-empire.fly.dev/api/content/images/count/today

   # Expected: ~50 images/day
   # Alert if: > 75 images/day

   # Action:
   # - Reuse thumbnails for similar content
   # - Generate fewer variations
   # - Use pre-made templates
   ```

4. **Immediate Mitigation** (if needed)
   ```bash
   # Pause non-critical workflows
   # Via Temporal UI or:
   curl -X POST https://ai-affiliate-empire.fly.dev/api/workflows/pause/non-critical

   # Reduce generation rates
   # Update environment variables
   flyctl secrets set CONTENT_GENERATION_RATE=0.5 --app ai-affiliate-empire

   # Enable aggressive caching
   flyctl secrets set CACHE_TTL=86400 --app ai-affiliate-empire
   ```

5. **Monitor and Adjust** (rest of day)
   - Check costs every 2 hours
   - Verify mitigation working
   - Resume normal operations when costs stabilize

---

## Cost Optimization Procedures

### Monthly Cost Review

**Schedule**: First business day of each month

**Procedure:**

1. **Generate Monthly Report** (15 minutes)
   ```bash
   # Get previous month's costs
   curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/month?month=10

   # Export to spreadsheet
   # Include:
   # - Total costs
   # - Cost per service
   # - Cost per content piece
   # - Cost per revenue dollar
   ```

2. **Analyze Trends** (30 minutes)
   - Compare to previous month
   - Identify cost increases
   - Calculate cost per metric:
     - Cost per video generated
     - Cost per blog post
     - Cost per $1 revenue
     - Cost per conversion

3. **Calculate ROI** (10 minutes)
   ```bash
   # Get revenue for month
   curl https://ai-affiliate-empire.fly.dev/api/analytics/revenue/month?month=10

   # Calculate ROI
   # ROI = (Revenue - Costs) / Costs * 100

   # Example:
   # Revenue: $2,500
   # Costs: $425
   # ROI = (2500 - 425) / 425 * 100 = 488%
   ```

4. **Identify Optimization Opportunities** (30 minutes)
   - Which services cost most?
   - Which have lowest ROI?
   - What can be optimized?
   - What can be eliminated?

5. **Create Action Plan** (30 minutes)
   - List optimization initiatives
   - Assign owners
   - Set deadlines
   - Track in project management tool

### API Usage Auditing

**Frequency**: Weekly

**Procedure:**

1. **Generate Usage Report** (10 minutes)
   ```bash
   # Get API call volumes
   curl https://ai-affiliate-empire.fly.dev/api/analytics/api-usage/week

   # Breakdown by service:
   # - OpenAI: calls, tokens, cost
   # - Anthropic: calls, tokens, cost
   # - DALL-E: images, cost
   # - ElevenLabs: characters, cost
   # - Pika: videos, cost
   ```

2. **Identify Unusual Patterns** (15 minutes)
   - Sudden spikes in usage
   - Failed requests (wasted money)
   - Retry loops
   - Duplicate requests

3. **Check Cache Hit Rates** (10 minutes)
   ```bash
   # Get cache statistics
   curl https://ai-affiliate-empire.fly.dev/api/cache/stats

   # Target: > 60% hit rate
   # If lower, investigate why
   ```

4. **Review Failed Requests** (15 minutes)
   ```bash
   # Check failed API calls
   curl https://ai-affiliate-empire.fly.dev/api/analytics/api-failures/week

   # Failed calls still cost money!
   # Identify causes:
   # - Rate limiting → Implement backoff
   # - Invalid requests → Fix validation
   # - Service downtime → Implement circuit breakers
   ```

5. **Optimize** (30 minutes)
   - Implement caching for repeated requests
   - Add request deduplication
   - Optimize retry logic
   - Batch requests where possible

### Resource Scaling Decisions

**When to Scale Up:**

✅ Scale up if:
- Consistently hitting resource limits
- Response times > 3 seconds p95
- CPU > 80% sustained
- Memory > 85% sustained
- Error rate > 2% due to capacity

**Cost vs Performance:**
```bash
# Current: 2x shared-cpu @ $50/month
flyctl scale vm shared-cpu-2x --app ai-affiliate-empire

# Option 1: 2x dedicated-cpu @ $75/month (+$25)
# - 2x performance
# - Lower latency
# - Better for AI workloads

# Option 2: 3x shared-cpu @ $75/month (+$25)
# - More instances for horizontal scaling
# - Better availability
# - Handles traffic spikes

# Decision criteria:
# - If CPU-bound → dedicated CPU
# - If traffic spikes → more instances
# - If both → dedicated + auto-scale
```

**When to Scale Down:**

✅ Scale down if:
- Resource utilization < 30% sustained
- Can meet SLAs with fewer resources
- Traffic has permanently decreased
- Optimizations reduced resource needs

**Process:**
1. Test in staging first
2. Monitor for 1 week
3. If stable, apply to production
4. Monitor for 2 weeks
5. Document savings

---

## Cost Optimization Strategies

### 1. Prompt Optimization

**Goal**: Reduce token usage by 20-30%

**Strategies:**
```typescript
// Before: Verbose prompt (200 tokens)
const prompt = `You are a professional content creator.
Please write a comprehensive, engaging, and SEO-optimized
video script about this product. Include an attention-grabbing
hook, detailed product benefits, social proof, and a strong
call-to-action. Make it conversational and natural.

Product: ${productName}
Description: ${longDescription}
...`;

// After: Concise prompt (100 tokens)
const prompt = `Write 60s video script for ${productName}.
Hook → Benefits → CTA.
Tone: Conversational.
Product: ${shortDescription}`;

// Savings: 50% tokens = 50% cost
```

**Implementation:**
- Review all prompts
- Remove redundant instructions
- Use shorter product descriptions
- Cache product research
- Reuse prompt templates

**Expected Savings**: $75-100/month

### 2. Caching Strategy

**Goal**: 60%+ cache hit rate

**What to Cache:**
- Product descriptions (24 hours)
- Trend analysis (6 hours)
- Generated thumbnails (7 days)
- API responses (varies by service)

**Implementation:**
```typescript
// Cache product data
const cacheKey = `product:${productId}`;
let product = await redis.get(cacheKey);

if (!product) {
  product = await fetchProduct(productId);
  await redis.setex(cacheKey, 86400, JSON.stringify(product));
}

// Cache API responses
const cacheKey = `api:openai:${hash(prompt)}`;
let response = await redis.get(cacheKey);

if (!response) {
  response = await openai.complete(prompt);
  await redis.setex(cacheKey, 3600, JSON.stringify(response));
}
```

**Expected Savings**: $50-75/month

### 3. Smart Batching

**Goal**: Reduce API calls by 30%

**Strategies:**
- Batch image generation (create 5 at once)
- Batch product fetching
- Combine similar prompts
- Use bulk APIs where available

```typescript
// Before: 10 API calls
for (const product of products) {
  await generateImage(product);  // 10 separate calls
}

// After: 1 API call
await generateImages(products);  // 1 batch call

// Savings: 90% fewer calls (if batch pricing available)
```

**Expected Savings**: $25-40/month

### 4. Workflow Optimization

**Goal**: Eliminate unnecessary work

**Audit Questions:**
- Are we generating content that doesn't get published?
- Are we re-generating similar content?
- Can we reuse content across platforms?
- Do we need to generate every day?

**Example Optimizations:**
- Generate content only for top-performing niches
- Reuse video scripts across platforms (with minor edits)
- Reduce blog post frequency (10/day → 5/day)
- Skip generation on low-traffic days

**Expected Savings**: $30-50/month

### 5. Service Alternatives

**Evaluate Alternatives:**

| Current | Alternative | Savings | Trade-off |
|---------|-------------|---------|-----------|
| GPT-4 Turbo | GPT-4-turbo | 50% cost | Slight quality drop |
| DALL-E 3 | Stable Diffusion | 80% cost | Different art style |
| ElevenLabs | Google TTS | 70% cost | Less natural voice |
| Pika Labs | RunwayML | Variable | Different features |

**Testing Process:**
1. A/B test alternative vs current (20% traffic)
2. Measure impact on:
   - Content quality scores
   - User engagement
   - Conversion rates
3. If < 10% drop in metrics → switch
4. If > 10% drop → keep current

**Expected Savings**: $50-100/month (if switching viable)

---

## Cost Alerts Configuration

### Alert Thresholds

```yaml
# Daily cost alerts
- alert: DailyCostHigh
  expr: sum(affiliate_api_cost_dollars) > 15
  labels:
    severity: warning
  annotations:
    summary: "Daily API costs exceed $15"

- alert: DailyCostCritical
  expr: sum(affiliate_api_cost_dollars) > 20
  labels:
    severity: critical
  annotations:
    summary: "Daily API costs exceed $20 - immediate action required"

# Monthly cost alerts
- alert: MonthlyCostProjectionHigh
  expr: sum(affiliate_api_cost_dollars{month=~".*"}) / day_of_month() * 30 > 450
  labels:
    severity: warning
  annotations:
    summary: "Projected monthly cost exceeds budget"

# Service-specific alerts
- alert: OpenAICostHigh
  expr: sum(affiliate_api_cost_dollars{service="openai"}) > 6
  labels:
    severity: warning
  annotations:
    summary: "OpenAI daily cost exceeds $6"
```

### Notification Channels

**Cost Alerts Sent To:**
- Slack: #cost-alerts
- Discord: #finance-alerts
- Email: finance@company.com
- Dashboard: Grafana Cost Dashboard

---

## Emergency Cost Controls

### Cost Runaway Scenario

**Trigger**: Costs exceeding $50/day (3.5x normal)

**Immediate Actions:**

1. **Stop All Non-Essential Workflows** (< 2 minutes)
   ```bash
   # Via Temporal UI or:
   curl -X POST https://ai-affiliate-empire.fly.dev/api/workflows/emergency-stop

   # This stops:
   # - Content generation
   # - Product syncing
   # - Optimization workflows

   # Keeps running:
   # - Publishing (already generated content)
   # - Analytics tracking
   # - Health checks
   ```

2. **Enable Mock Mode** (< 1 minute)
   ```bash
   # Switch to mock AI services
   flyctl secrets set ENABLE_MOCK_MODE=true --app ai-affiliate-empire

   # System continues functioning but:
   # - No real API calls
   # - Returns cached/sample data
   # - Stops incurring costs
   ```

3. **Identify Runaway Process** (5 minutes)
   ```bash
   # Check which service is driving costs
   curl https://ai-affiliate-empire.fly.dev/api/analytics/costs/breakdown/hourly

   # Check for retry loops
   flyctl logs --app ai-affiliate-empire | grep -i "retry\|attempt"

   # Check Temporal for stuck workflows
   # Access Temporal UI
   ```

4. **Kill Problematic Workflows** (2 minutes)
   ```bash
   # Via Temporal UI:
   # - Terminate stuck workflows
   # - Cancel pending workflows

   # Or via API:
   curl -X POST https://ai-affiliate-empire.fly.dev/api/workflows/terminate/<workflow-id>
   ```

5. **Notify Team** (1 minute)
   ```bash
   # Send emergency notification
   ./.claude/send-discord.sh '🚨 EMERGENCY: Cost runaway detected. All workflows stopped. Daily costs: $50. Investigating.'
   ```

6. **Investigate Root Cause** (30 minutes)
   - Check deployment history
   - Review recent code changes
   - Analyze logs for errors
   - Identify what triggered spike

7. **Implement Fix** (varies)
   - Fix code bug
   - Update workflow configuration
   - Adjust rate limits
   - Deploy hotfix

8. **Resume Operations** (after fix verified)
   ```bash
   # Disable mock mode
   flyctl secrets unset ENABLE_MOCK_MODE --app ai-affiliate-empire

   # Resume workflows gradually
   # Start with 10% capacity
   # Monitor costs for 1 hour
   # Increase to 50% if stable
   # Return to 100% after 24 hours
   ```

---

## Cost Tracking Tools

### Grafana Cost Dashboard

**Panels:**
1. Total Daily Cost (gauge)
2. Cost Breakdown by Service (pie chart)
3. Daily Cost Trend (line graph)
4. Cost per Video (stat)
5. Cost vs Revenue (dual axis)
6. Monthly Cost Projection (stat)
7. Budget Remaining (bar gauge)

**Access**: http://localhost:3002 → AI Affiliate Empire - Cost Tracking

### Cost API Endpoints

```bash
# Today's costs
GET /api/analytics/costs/today

# This week
GET /api/analytics/costs/week

# This month
GET /api/analytics/costs/month

# Cost breakdown
GET /api/analytics/costs/breakdown

# Cost per metric
GET /api/analytics/costs/per-video
GET /api/analytics/costs/per-post
GET /api/analytics/costs/per-revenue

# API usage
GET /api/analytics/api-usage/today
GET /api/analytics/api-usage/week
```

### Cost Tracking Spreadsheet

**Monthly Template:**
- Service costs (actual vs budget)
- Cost per content piece
- Cost per revenue dollar
- ROI calculation
- Month-over-month comparison
- Optimization initiatives

---

## Related Runbooks

- [Monitoring Alerts](./monitoring-alerts.md#highapicosts) - Cost alert response
- [Performance Degradation](./performance-degradation.md) - Resource optimization
- [Incident Response](./incident-response.md) - Emergency procedures

---

## References

- Grafana Cost Dashboard
- Cost tracking spreadsheet (Google Sheets/Excel)
- API provider pricing pages
- Budget planning document

---

**Document Version**: 1.0
**Last Tested**: 2025-10-31
**Next Review**: 2025-11-30
