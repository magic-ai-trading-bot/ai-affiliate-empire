# Trend Data Integration - Quick Summary

**Plan File**: `plans/251101-trend-data-integration-plan.md`
**Status**: ✅ Complete Implementation Plan Ready
**Effort**: 70 hours (10 days)
**Cost**: $0-80/month (start at $0)

---

## What It Solves

**Problem**: Product ranking currently uses placeholder trend scores (always 0.5)
- Impact: Products ranked 50% effective (profit-only, missing demand signals)
- Missing data: Search trends, social virality, community interest, viral products

**Solution**: Integrate 4 trend data sources
1. Google Trends (search interest)
2. Twitter/X (social virality & mentions)
3. Reddit (community demand signals)
4. TikTok (viral product trends)

**Result**: Real-time trend scoring → Better product selection → Higher conversion rates

---

## Architecture at a Glance

```
Product Ranker
  ├── Profit Score (commission)         [40% weight] ✅ Working
  ├── Trend Score (search interest)     [30% weight] ❌ Placeholder → ✅ Google Trends
  └── Virality Score (social)           [30% weight] ❌ Placeholder → ✅ Aggregated (Twitter+Reddit+TikTok)

Trend Aggregator (New)
  ├── Google Trends Provider (free)
  ├── Twitter/X Provider (free tier available)
  ├── Reddit Provider (free)
  └── TikTok Provider (paid $20/mo)

Caching Layer
  ├── Redis (fast hits: <10ms)
  └── PostgreSQL (persistent, 12-24h TTL)
```

---

## Key Features

✅ **4 Data Sources**: Google, Twitter, Reddit, TikTok
✅ **Smart Caching**: 12-24 hour TTL, dual-layer (Redis + DB)
✅ **Rate Limiting**: Per-source daily limits & request throttling
✅ **Graceful Degradation**: Fallback to cached data if API fails
✅ **Cost Controlled**: Start free ($0), grow to $80/mo max
✅ **Partial Success**: Works with 1+ sources (doesn't need all)
✅ **Easy Disable**: Each source can be toggled on/off
✅ **Monitoring**: Track API health, cache hit rates, failures

---

## API Comparison

| Source | Cost | Setup Time | Rate Limit | Status |
|--------|------|-----------|-----------|--------|
| **Google Trends** | Free | <5min | 60/min | ✅ Start here |
| **Reddit** | Free | 5-10min | 60/min | ✅ Include day 1 |
| **Twitter/X** | $0-200/mo | 1-2 weeks | 300/15min | ⚠️ Add after |
| **TikTok** | $20/mo | 10min | Custom | ⚠️ Add if budget |

**Recommendation**: Start with Google + Reddit (free), add Twitter when API approved, add TikTok later if valuable.

---

## Implementation Phases

### Phase 1: Setup (5 hours)
- Add database models (TrendCache, TrendDataSource)
- Update environment variables
- Install dependencies

### Phase 2: Trend Providers (25 hours)
- Google Trends Provider (4h) - Pytrends wrapper
- Twitter/X Provider (5h) - X API v2 integration
- Reddit Provider (4h) - OAuth + API integration
- TikTok Provider (3h) - Apify wrapper + polling
- Rate limiter (2h) - Daily limits & throttling
- Cache service (2h) - Redis + database dual-layer

### Phase 3: Aggregator (15 hours)
- Trend Aggregator Service (10h) - Parallel fetching, merging, fallbacks
- Error handling & circuit breakers (3h)
- Score normalization (2h)

### Phase 4: Integration (8 hours)
- Update ProductRankerService
- Wire up dependency injection
- Add trend update scheduler

### Phase 5: Testing (12 hours)
- Unit tests (5h)
- Integration tests (4h)
- Performance testing (3h)

### Phase 6: Documentation (5 hours)
- Architecture documentation
- Setup guides per API
- Troubleshooting guides
- Monitoring dashboard updates

---

## Files to Create (20)

### Core Services
- trend-aggregator.service.ts
- trend-updater.service.ts
- trend-providers/ (4 providers)
- trend-cache.service.ts
- trend-rate-limiter.service.ts

### Tests
- 6 test files (unit + integration)

### Documentation
- trend-data-integration.md
- trend-setup guides (3 files)
- implementation report

### Configuration
- .env additions
- trend-config.ts

### Database
- Migration for TrendCache & TrendDataSource models

---

## Files to Modify (5)

1. `src/modules/product/services/product-ranker.service.ts`
   - Remove placeholder trend logic
   - Inject TrendAggregatorService

2. `src/modules/product/product.module.ts`
   - Register new providers

3. `prisma/schema.prisma`
   - Add TrendCache model
   - Add TrendDataSource model

4. `package.json`
   - Add pytrends, twitter-api-client

5. `.env.example`
   - Add 30+ trend configuration variables

---

## Configuration Needed

```env
# Free (no setup)
GOOGLE_TRENDS_ENABLED=true
REDDIT_API_ENABLED=true

# Optional (approval needed)
TWITTER_API_ENABLED=false  # Requires elevated access approval
TWITTER_BEARER_TOKEN=xxx

# Optional (paid)
TIKTOK_API_ENABLED=false   # Costs $20/mo
TIKTOK_API_KEY=xxx

# Caching
TREND_CACHE_TTL_HOURS=12
TREND_CACHE_STRATEGY=redis
TREND_FALLBACK_SCORE=0.5
```

---

## Cost Breakdown

### One-Time
- Implementation: 70 hours (your developer time)
- Setup: <1 hour per API

### Monthly Operating
| Source | Cost |
|--------|------|
| Google Trends (pytrends) | Free |
| Reddit API | Free |
| Twitter/X API (free tier) | Free |
| TikTok API (if enabled) | $20/mo |
| **Total** | **$0-80/mo** |

---

## Performance Targets

| Metric | Target | Expectation |
|--------|--------|-------------|
| Cache hit latency | <10ms | ✅ Very fast (Redis) |
| Cold cache latency | <5s | ✅ With retries & fallback |
| Cache hit rate | >85% | ✅ After 24 hours |
| Product ranking time | <30s | ✅ For 100 products |
| API availability | >95% | ✅ With fallbacks |

---

## Success Metrics

### Technical
✅ Trend scores vary (not all 0.5)
✅ Cache hit rate >85%
✅ No rate limit violations
✅ All tests pass

### Business
✅ Better product selection
✅ Higher conversion rates
✅ <$0.01 cost per ranking
✅ Measurable ROI improvement

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Pytrends unmaintained | Breakage | Fallback to Apify, monitor |
| Rate limits exceeded | Blocked API | Rate limiter + daily tracking |
| API outages | No trends | Graceful fallback to cache |
| Cost overruns | Budget | Daily spend tracking, caps |
| Data quality issues | Bad rankings | A/B test, adjust weights |

---

## Unresolved Questions

1. **Use pytrends (free) or Apify (reliable, $10/mo) for Google Trends?**
2. **Request Twitter API now or implement others first?**
3. **Worth $20/mo for TikTok or skip initially?**
4. **Equal weighting for all sources or optimize per category?**
5. **Fixed 12h cache TTL or vary by product category?**

See full plan for discussion.

---

## Getting Started

1. **Read the full plan**: `plans/251101-trend-data-integration-plan.md`
2. **Start Phase 1**: Database migrations + environment setup
3. **Parallel Phase 2**: Implement trend providers (can be done in parallel)
4. **Test continuously**: Each phase has unit tests
5. **Deploy gradually**: Google+Reddit → Twitter → TikTok

---

**Document**: 251101-trend-integration-summary.md
**Created**: 2025-11-01
**For**: Implementation ready
**Next Step**: Begin Phase 1 implementation
