# Trend Data Integration - Implementation Checklist

**Status**: Ready to implement
**Estimated Duration**: 70 hours (10 business days)
**Last Updated**: 2025-11-01

---

## Phase 1: Setup & Infrastructure (5 hours) — Day 1

### Task 1.1: Database Migrations (1 hour)
- [ ] Create Prisma migration for TrendCache model
- [ ] Create Prisma migration for TrendDataSource model
- [ ] Add relations to Product model
- [ ] Run: `npx prisma migrate dev --name add_trend_models`
- [ ] Verify migrations in `prisma/migrations/`
- [ ] Test: `npm run prisma:generate`

**Files affected**:
- prisma/schema.prisma
- prisma/migrations/[timestamp]_add_trend_models/migration.sql

### Task 1.2: Environment Configuration (30 min)
- [ ] Update `.env.example` with trend variables
- [ ] Document each variable with comments
- [ ] Add cost notes for paid APIs
- [ ] Update local `.env` for development
- [ ] Create sample config for each provider setup

**Environment variables to add**:
```
TREND_CACHE_ENABLED=true
TREND_CACHE_TTL_HOURS=12
TREND_CACHE_STRATEGY=redis
TREND_FALLBACK_SCORE=0.5
GOOGLE_TRENDS_ENABLED=true
GOOGLE_TRENDS_BATCH_SIZE=5
GOOGLE_TRENDS_RETRY_DELAY_MS=2000
GOOGLE_TRENDS_MAX_RETRIES=3
TWITTER_API_ENABLED=false
TWITTER_API_VERSION=v2
TWITTER_BEARER_TOKEN=
TWITTER_REQUEST_LIMIT=300
TWITTER_DAILY_LIMIT=10000
REDDIT_API_ENABLED=true
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USERNAME=
REDDIT_PASSWORD=
REDDIT_REQUEST_LIMIT=60
REDDIT_DAILY_LIMIT=50000
TIKTOK_API_ENABLED=false
TIKTOK_API_ENDPOINT=
TIKTOK_API_KEY=
TIKTOK_DAILY_LIMIT=100
TREND_UPDATE_SCHEDULE=0 0 * * *
TREND_ALERT_THRESHOLD=0.8
TREND_ALERT_EMAIL=admin@example.com
```

**Files affected**:
- .env.example (30 lines added)
- .env (local development)

### Task 1.3: Dependencies Installation (30 min)
- [ ] Run: `npm install pytrends twitter-api-client axios`
- [ ] Verify installed: `npm ls pytrends twitter-api-client`
- [ ] Update `package.json` (should auto-update)
- [ ] Check for conflicts: `npm audit`
- [ ] Document why each dependency needed

**Dependencies to add**:
- `pytrends` - Google Trends data
- `twitter-api-client` - X API v2
- `axios` - HTTP requests (verify already installed)

**Files affected**:
- package.json (lock file auto-updates)
- package-lock.json

### Task 1.4: Create Service Structure (30 min)
- [ ] Create directory: `src/modules/product/services/trend-providers/`
- [ ] Create directory: `src/common/cache/`
- [ ] Create directory: `src/common/rate-limiting/`
- [ ] Create placeholder files for each service:
  - [ ] `trend-aggregator.service.ts`
  - [ ] `trend-updater.service.ts`
  - [ ] `trend-providers/google-trends.provider.ts`
  - [ ] `trend-providers/twitter-trends.provider.ts`
  - [ ] `trend-providers/reddit-trends.provider.ts`
  - [ ] `trend-providers/tiktok-trends.provider.ts`
  - [ ] `cache/trend-cache.service.ts`
  - [ ] `rate-limiting/trend-rate-limiter.service.ts`

**Files affected**:
- 8 new service files (placeholders OK)

---

## Phase 2: Trend Providers Implementation (25 hours) — Days 2-4

### Task 2.1: Google Trends Provider (4 hours)
- [ ] Implement GoogleTrendsProvider class
- [ ] Add `getTrendScore(keyword)` method
- [ ] Implement pytrends wrapper/HTTP call
- [ ] Add score normalization (0-1 scale)
- [ ] Implement retry logic with exponential backoff
- [ ] Add rate limit handling (60 req/min)
- [ ] Add error logging
- [ ] Add TypeScript interfaces

**Acceptance criteria**:
- [ ] Returns score between 0-1
- [ ] Handles rate limits gracefully
- [ ] Retries failed requests (3 times)
- [ ] Logs all errors with context

**File**: `src/modules/product/services/trend-providers/google-trends.provider.ts`

### Task 2.2: Twitter/X Trends Provider (5 hours)
- [ ] Implement TwitterTrendsProvider class
- [ ] Initialize TwitterApi client
- [ ] Add `getViralityScore(productName)` method
- [ ] Implement mention search with engagement metrics
- [ ] Calculate engagement rate (likes+retweets+replies)/mentions
- [ ] Normalize virality score to 0-1
- [ ] Add rate limit tracking (300 per 15 min)
- [ ] Add fallback to mock data if API disabled
- [ ] Add error handling for auth failures

**Acceptance criteria**:
- [ ] Returns score between 0-1
- [ ] Tracks rate limit per 15 min window
- [ ] Falls back to mock (0.5) if disabled
- [ ] Handles 401/403 auth errors gracefully

**File**: `src/modules/product/services/trend-providers/twitter-trends.provider.ts`

**Note**: Start with API_ENABLED=false, users must request elevated access

### Task 2.3: Reddit Trends Provider (4 hours)
- [ ] Implement RedditTrendsProvider class
- [ ] Implement OAuth token refresh logic
- [ ] Add `getRedditScore(productName)` method
- [ ] Implement Reddit search API integration
- [ ] Calculate discussion score (upvotes normalized)
- [ ] Track relevant subreddits
- [ ] Add token expiration handling
- [ ] Add rate limit handling (60 req/min)

**Acceptance criteria**:
- [ ] Returns score between 0-1
- [ ] Maintains valid OAuth token
- [ ] Respects 60 req/min limit
- [ ] Handles auth failures gracefully

**File**: `src/modules/product/services/trend-providers/reddit-trends.provider.ts`

**Setup required**:
- Create Reddit app at reddit.com/prefs/apps
- Get CLIENT_ID, CLIENT_SECRET
- Document setup process

### Task 2.4: TikTok Trends Provider (3 hours)
- [ ] Implement TiktokTrendsProvider class
- [ ] Add `getTiktokScore(productName)` method
- [ ] Implement Apify TikTok API wrapper
- [ ] Add polling for async results
- [ ] Track videos, views, engagement, hashtags
- [ ] Normalize virality score to 0-1
- [ ] Add graceful fallback if API disabled
- [ ] Add error handling for timeouts

**Acceptance criteria**:
- [ ] Returns score between 0-1
- [ ] Handles async API calls with polling
- [ ] Polls max 30 times (60 seconds timeout)
- [ ] Falls back to mock (0.5) if disabled

**File**: `src/modules/product/services/trend-providers/tiktok-trends.provider.ts`

**Note**: Start with API_ENABLED=false, costs $20/month

### Task 2.5: Rate Limiter Service (2 hours)
- [ ] Implement TrendRateLimiter class
- [ ] Add `canMakeRequest(sourceName)` method
- [ ] Add `recordRequest(sourceName)` method
- [ ] Implement daily counter reset
- [ ] Add `updateSourceStatus()` for error tracking
- [ ] Add enable/disable per source
- [ ] Add logging for limit violations

**Acceptance criteria**:
- [ ] Prevents requests when daily limit exceeded
- [ ] Resets counters at midnight UTC
- [ ] Logs all violations
- [ ] Tracks per-source status

**File**: `src/common/rate-limiting/trend-rate-limiter.service.ts`

### Task 2.6: Trend Cache Service (2 hours)
- [ ] Implement TrendCacheService class
- [ ] Add dual-layer cache: Redis + Database
- [ ] Implement `get(productId)` with Redis fallback
- [ ] Implement `set(productId, data, ttl)`
- [ ] Implement `delete(productId)`
- [ ] Add `isValid(nextUpdateAt)` TTL check
- [ ] Add `getNeedingRefresh()` for stale detection
- [ ] Add proper error handling

**Acceptance criteria**:
- [ ] Cache hits return in <20ms
- [ ] Database fallback works if Redis down
- [ ] TTL validation works correctly
- [ ] Handles missing keys gracefully

**File**: `src/common/cache/trend-cache.service.ts`

---

## Phase 3: Trend Aggregator Service (15 hours) — Days 5-6

### Task 3.1: Aggregator Core Logic (10 hours)
- [ ] Implement TrendAggregatorService class
- [ ] Add `getTrendScores(product)` public method
- [ ] Implement cache check (return if valid)
- [ ] Implement `fetchAndAggregate()` private method
- [ ] Add parallel fetching from all 4 providers
- [ ] Implement Promise.allSettled() for partial success
- [ ] Add graceful failure handling (works with 1+ sources)
- [ ] Implement score aggregation (weighted or equal average)
- [ ] Add fallback score if all fail
- [ ] Cache successful result
- [ ] Add comprehensive logging

**Aggregation logic**:
```typescript
aggregatedScore = (
  googleScore +
  twitterScore +
  redditScore +
  tiktokScore
) / 4;
```

**Failure modes**:
- 1 source fails: Use other 3
- 2+ sources fail: Use available sources
- All sources fail: Return fallback 0.5
- Cache fail: Use last DB value

**File**: `src/modules/product/services/trend-aggregator.service.ts`

**Acceptance criteria**:
- [ ] Returns normalized score (0-1)
- [ ] Works with 1+ sources available
- [ ] Falls back to 0.5 if all fail
- [ ] Caches successful results
- [ ] Logs failures with context

### Task 3.2: Error Handling & Circuit Breaker (3 hours)
- [ ] Add try-catch for each provider call
- [ ] Implement circuit breaker for consistently failing sources
- [ ] Add exponential backoff for retries
- [ ] Add timeout handling
- [ ] Track failed sources in cache
- [ ] Add health check endpoint
- [ ] Add error recovery logic

**File**: Same as Task 3.1 (integrated)

**Acceptance criteria**:
- [ ] Failed sources don't crash ranking
- [ ] Retries use exponential backoff
- [ ] Circuit breaker prevents cascading failures
- [ ] Health check reports API status

### Task 3.3: Score Normalization (2 hours)
- [ ] Verify all scores are 0-1 range
- [ ] Add bounds checking (clamp to [0, 1])
- [ ] Test with edge cases (0, 1, negative, >1)
- [ ] Document normalization per source
- [ ] Add unit tests for normalization

**File**: Same as Task 3.1 (integrated)

**Acceptance criteria**:
- [ ] All returned scores are 0-1
- [ ] No values clamped unexpectedly
- [ ] Edge cases handled correctly

---

## Phase 4: Integration with ProductRanker (8 hours) — Days 7

### Task 4.1: Update ProductRankerService (4 hours)
- [ ] Remove placeholder trend score logic
- [ ] Inject TrendAggregatorService
- [ ] Update `calculateTrendScore()` method:
  - Call aggregator instead of returning 0.5
  - Use googleTrendScore from aggregator
- [ ] Update `calculateViralityScore()` method:
  - Call aggregator instead of returning 0.5
  - Use aggregatedScore from aggregator
- [ ] Keep `calculateProfitScore()` unchanged
- [ ] Update score calculation weights
- [ ] Add logging for debugging
- [ ] Add TypeScript types

**File**: `src/modules/product/services/product-ranker.service.ts`

**Changes needed**:
```typescript
// OLD
async calculateTrendScore(product): Promise<number> {
  return 0.5; // Placeholder
}

// NEW
async calculateTrendScore(product): Promise<number> {
  const trendData = await this.trendAggregator.getTrendScores(product);
  return trendData.googleTrendScore;
}
```

**Acceptance criteria**:
- [ ] Trend scores are no longer 0.5
- [ ] Scores vary based on actual trends
- [ ] ProductRanker still works as expected
- [ ] No errors or crashes

### Task 4.2: Update ProductModule (2 hours)
- [ ] Import all new trend services
- [ ] Add to `providers` array
- [ ] Add proper dependency injection
- [ ] Update module exports if needed
- [ ] Verify no circular dependencies
- [ ] Test module compilation

**File**: `src/modules/product/product.module.ts`

**Changes needed**:
```typescript
@Module({
  providers: [
    ProductService,
    ProductRanker,
    TrendAggregatorService,
    GoogleTrendsProvider,
    TwitterTrendsProvider,
    RedditTrendsProvider,
    TiktokTrendsProvider,
    TrendCacheService,
    TrendRateLimiter,
  ],
})
```

**Acceptance criteria**:
- [ ] Module compiles without errors
- [ ] Dependency injection works
- [ ] No circular dependency warnings

### Task 4.3: Add Trend Update Scheduler (2 hours)
- [ ] Create TrendUpdaterService with @Cron decorator
- [ ] Implement daily refresh at midnight (0 0 * * *)
- [ ] Find stale cache entries
- [ ] Refresh trends in batches (100 products)
- [ ] Add error handling per product
- [ ] Add logging of refresh progress
- [ ] Register in AppModule or ProductModule

**File**: `src/modules/product/services/trend-updater.service.ts`

**Acceptance criteria**:
- [ ] Scheduler runs daily
- [ ] Refreshes stale trends proactively
- [ ] Handles partial failures gracefully
- [ ] Logs progress and errors

---

## Phase 5: Testing (12 hours) — Days 8-9

### Task 5.1: Unit Tests (5 hours)
- [ ] Create test files for each trend provider:
  - [ ] `test/unit/product/services/trend-providers/google-trends.provider.spec.ts`
  - [ ] `test/unit/product/services/trend-providers/twitter-trends.provider.spec.ts`
  - [ ] `test/unit/product/services/trend-providers/reddit-trends.provider.spec.ts`
  - [ ] `test/unit/product/services/trend-providers/tiktok-trends.provider.spec.ts`
- [ ] Create test file for aggregator:
  - [ ] `test/unit/product/services/trend-aggregator.service.spec.ts`
- [ ] Mock API responses
- [ ] Test score normalization (0-1 range)
- [ ] Test error handling and fallbacks
- [ ] Test rate limit checking
- [ ] Test caching behavior
- [ ] Run: `npm test -- --testPathPattern=trend`
- [ ] Verify >80% code coverage

**Test cases per provider**:
- Happy path (success)
- API error (500)
- Rate limit (429)
- Invalid response
- Timeout
- Fallback to mock

**File**: Multiple test files created

**Acceptance criteria**:
- [ ] All unit tests pass
- [ ] >80% code coverage
- [ ] No flaky tests
- [ ] All error cases covered

### Task 5.2: Integration Tests (4 hours)
- [ ] Create integration test file:
  - [ ] `test/integration/product/trend-integration.spec.ts`
- [ ] Test end-to-end flow: DB → Cache → API → Ranking
- [ ] Test rate limit enforcement across requests
- [ ] Test cache refresh lifecycle
- [ ] Test batch scoring (100+ products)
- [ ] Test API failure recovery
- [ ] Test with actual (mocked) APIs
- [ ] Run: `npm run test:integration`

**Test scenarios**:
- Fresh product (cache miss)
- Cached product (cache hit)
- Stale cache (refresh needed)
- API temporarily down
- Rate limit exceeded
- Partial source failure (1 of 4 fails)
- All sources fail

**File**: `test/integration/product/trend-integration.spec.ts`

**Acceptance criteria**:
- [ ] All integration tests pass
- [ ] End-to-end flow works
- [ ] Fallback mechanisms work
- [ ] Rate limits enforced

### Task 5.3: Performance Tests (3 hours)
- [ ] Benchmark cache hit latency (<10ms target)
- [ ] Benchmark API call latency (<5s target)
- [ ] Benchmark product ranking time (<30s for 100 products)
- [ ] Test concurrent requests (100+ simultaneous)
- [ ] Test memory usage (cache size)
- [ ] Test database query performance
- [ ] Document baseline metrics

**Performance targets**:
- Cache hit: <10ms
- API call: <5s (with retries)
- Ranking 100 products: <30s
- Memory for 1000 cached products: <100MB

**File**: Performance test in test suite or separate script

**Acceptance criteria**:
- [ ] All latency targets met
- [ ] No memory leaks
- [ ] Concurrent requests handled
- [ ] Metrics documented

---

## Phase 6: Documentation & Deployment (5 hours) — Day 10

### Task 6.1: Main Documentation (2 hours)
- [ ] Create `docs/trend-data-integration.md`:
  - [ ] Architecture overview
  - [ ] Data flow diagrams
  - [ ] Score aggregation algorithm
  - [ ] Caching strategy
  - [ ] Rate limiting approach
  - [ ] Failure scenarios
  - [ ] Performance characteristics
- [ ] Create `docs/guides/trend-setup.md`:
  - [ ] How to enable each API
  - [ ] Cost breakdown
  - [ ] Environment variable reference
  - [ ] Setup checklist per API

**Files created**:
- docs/trend-data-integration.md (architecture)
- docs/guides/trend-setup.md (setup instructions)

**Acceptance criteria**:
- [ ] Documentation is clear and complete
- [ ] All APIs documented
- [ ] Setup process documented
- [ ] Cost implications clear

### Task 6.2: API-Specific Setup Guides (1 hour)
- [ ] Create `docs/guides/trend-google-setup.md`:
  - [ ] How to use pytrends
  - [ ] Troubleshooting rate limits
  - [ ] Fallback to Apify
- [ ] Create `docs/guides/trend-twitter-setup.md`:
  - [ ] How to apply for elevated access
  - [ ] OAuth setup
  - [ ] Cost ($200/mo)
- [ ] Create `docs/guides/trend-reddit-setup.md`:
  - [ ] How to create Reddit app
  - [ ] OAuth setup
  - [ ] Free tier details
- [ ] Create `docs/guides/trend-tiktok-setup.md`:
  - [ ] How to enable Apify API
  - [ ] Cost ($20/mo)
  - [ ] Enabling/disabling

**Files created**:
- docs/guides/trend-google-setup.md
- docs/guides/trend-twitter-setup.md
- docs/guides/trend-reddit-setup.md
- docs/guides/trend-tiktok-setup.md

**Acceptance criteria**:
- [ ] Each API documented
- [ ] Setup process clear
- [ ] Troubleshooting included
- [ ] Cost documented

### Task 6.3: Monitoring & Alerting (1 hour)
- [ ] Update monitoring dashboard:
  - [ ] Trend score distribution
  - [ ] API availability per source
  - [ ] Cache hit rate
  - [ ] Rate limit usage
  - [ ] Failed sources count
  - [ ] Average ranking time
- [ ] Add health check endpoint
- [ ] Add alerting rules

**Metrics to track**:
- Trend scores (distribution, avg, median)
- Cache hit rate (%)
- API success rate per source (%)
- Rate limit usage (% of daily limit)
- API latency (p50, p95, p99)
- Product ranking latency

**File**: Update monitoring configuration

**Acceptance criteria**:
- [ ] Metrics collected and visible
- [ ] Alerts configured
- [ ] Dashboard updated

### Task 6.4: Implementation Report (1 hour)
- [ ] Create `docs/reports/trend-integration-implementation-report.md`:
  - [ ] What was implemented
  - [ ] What works
  - [ ] Known limitations
  - [ ] Performance metrics achieved
  - [ ] Cost analysis
  - [ ] Recommendations for future
  - [ ] Lessons learned

**File**: `docs/reports/trend-integration-implementation-report.md`

**Acceptance criteria**:
- [ ] Report completed
- [ ] Metrics included
- [ ] Recommendations for next steps

---

## Final Verification (Before Merge)

### Code Quality
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] Code coverage >80%: `npm run test:coverage`

### Functionality
- [ ] Product ranking uses real trends (not 0.5)
- [ ] Trend scores vary per product
- [ ] Cache works (hit rate >85% after 24h)
- [ ] Rate limits not exceeded
- [ ] Fallback works when APIs down

### Documentation
- [ ] Main documentation complete
- [ ] Setup guides per API
- [ ] API costs documented
- [ ] Troubleshooting guide provided
- [ ] README updated

### Performance
- [ ] Cache hits <10ms
- [ ] API calls <5s
- [ ] Ranking 100 products <30s
- [ ] Memory usage acceptable
- [ ] No N+1 queries

### Security
- [ ] API keys not in code (using env vars)
- [ ] Secrets encrypted in database
- [ ] Rate limits prevent abuse
- [ ] Error messages don't leak data

---

## Dependencies & Prerequisites

### Before Starting
- [ ] Node.js 18+ installed
- [ ] PostgreSQL running
- [ ] Redis running (for caching)
- [ ] Existing project running locally

### For Each Provider

**Google Trends**:
- [ ] pytrends installed
- [ ] No setup needed (free)

**Reddit**:
- [ ] Reddit account
- [ ] Create app at reddit.com/prefs/apps (5 min)
- [ ] Get CLIENT_ID, CLIENT_SECRET
- [ ] Set REDDIT_USERNAME, REDDIT_PASSWORD env vars

**Twitter/X** (optional):
- [ ] X Developer account
- [ ] Apply for elevated access
- [ ] Wait for approval (1-2 weeks)
- [ ] Get BEARER_TOKEN

**TikTok** (optional):
- [ ] Apify account
- [ ] Subscribe to TikTok API (paid)
- [ ] Get API_KEY

---

## Success Criteria - Final Checklist

### ✅ Implementation Complete When:

- [ ] All 70 hours of tasks completed
- [ ] All code committed to feature branch
- [ ] All tests passing (100%)
- [ ] All documentation complete
- [ ] Code review passed
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] PR created and approved
- [ ] Merged to main branch
- [ ] Deployed to staging
- [ ] Monitoring verified
- [ ] Team trained on new features

### ✅ Product Ready When:

- [ ] Product ranking uses real trend data
- [ ] Trends vary per product (not all 0.5)
- [ ] Cache hit rate >85%
- [ ] No API rate limit violations
- [ ] Fallback works when APIs down
- [ ] Cost tracking shows actual usage
- [ ] A/B test shows improvement

---

**Checklist Version**: 1.0
**Created**: 2025-11-01
**Status**: Ready to implement
**Total Tasks**: 40+ checkboxes
