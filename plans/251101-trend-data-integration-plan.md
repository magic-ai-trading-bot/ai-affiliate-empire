# Trend Data Integration Implementation Plan

**Date**: 2025-11-01
**Status**: Ready for Implementation
**Priority**: High (Blocks accurate product ranking)
**Estimated Effort**: 40-60 hours
**Timeline**: 2-3 weeks (3-5 days implementation + testing + optimization)

---

## Executive Summary

Product ranking currently uses placeholder trend scores (always returns 0.5). This plan implements real-time trend data integration from 4 sources:
- Google Trends (search interest)
- Twitter/X (social mentions & virality)
- Reddit (community discussion & demand signals)
- TikTok (viral product trends)

**Goal**: Replace placeholder scores with real trend data while maintaining 6-24 hour cache and respecting API rate limits.

**Cost Impact**: $40-80/month for paid services (offset by more accurate product selection → higher ROI)

---

## Current State Analysis

### Existing Implementation
```
ProductRankerService (src/modules/product/services/product-ranker.service.ts):
├── calculateTrendScore() → TODO: Google Trends API
├── calculateViralityScore() → TODO: Twitter/Reddit/TikTok APIs
├── calculateProfitScore() → ✅ Working (commission-based)
├── calculateScores() → Weights: Trend 30%, Profit 40%, Virality 30%
└── rankProducts() → Returns sorted products by overall score (0-1 scale)

Current Behavior: All trend data returns placeholder 0.5 score
Impact: Product ranking 50% effective (profit-only, missing virality/demand signals)
```

### Database Schema
```prisma
model Product {
  id            String   @id
  title         String
  price         Decimal
  commission    Decimal
  category      String?
  brand         String?

  // AI Scoring fields ready
  trendScore    Float    @default(0)       // Currently placeholder
  profitScore   Float    @default(0)
  viralityScore Float    @default(0)
  overallScore  Float    @default(0)
  lastRankedAt  DateTime?

  @@index([status, overallScore])
}
```

**Gap**: No trend caching table. Need to add TrendCache model.

---

## API Research & Recommendations

### 1. Google Trends (Search Interest)

#### Options Evaluated

| Option | Cost | Rate Limit | Accuracy | Recommendation |
|--------|------|-----------|----------|-----------------|
| **Pytrends** (Free) | $0 | ~60 req/min | Medium | ✅ Primary (free) |
| **Apify** | $10/mo (free tier) | 100 calls/mo free | High | ⚠️ Fallback |
| **Glimpse** | $40/mo (Pro) | 250/mo | Very High | ❌ Too expensive |
| **Zenserp** | Variable | Pay-per-call | High | ⚠️ Paid option |

**Recommendation**: **Pytrends** (free, unmaintained but stable)
- **Pros**: Free, 2M+ downloads, proven in production
- **Cons**: Scrapes Google (violates ToS but common practice), no official support
- **Rate Limit**: ~60 requests/minute before blocking (60s backoff)
- **Fallback**: Use last cached value if rate-limited

**Implementation**:
```typescript
// Use pytrends library
import { TrendReq } from 'pytrends';

const pytrends = new TrendReq();
const trendData = await pytrends.build_payload(['smartphone']);
const interest = await pytrends.interest_over_time();
```

### 2. Twitter/X API (Social Virality)

#### Options Evaluated

| Option | Cost | Rate Limit | Trending Data | Recommendation |
|--------|------|-----------|---|-----------------|
| **X API v2** (Paid) | $200+/mo | Limited | Yes | ⚠️ Expensive |
| **X API v2** (Pay-per-use beta) | $0.15/1K calls | Higher | Yes | ✅ Best option |
| **Apify X Trends** | $10-50/mo | Custom | Yes | ⚠️ Moderate cost |
| **PRAW** (Unofficial) | $0 | Self-throttle | No | ❌ Wrong platform |

**Recommendation**: **X API v2 (Pay-per-use beta)**
- **Access**: Apply at developer.twitter.com → Apply for elevated access
- **Cost**: $0.15 per 1,000 POST requests (estimate $1-5/month for product mentions)
- **Rate Limit**: 300 requests per 15 minutes
- **Benefit**: Official, reliable, no scraping

**Alternative if rejected**: Use **Apify X Trends Scraper** ($10-50/month)

**Implementation**:
```typescript
// Use @twitter-api/client
import { TwitterApi } from 'twitter-api-client';

const client = new TwitterApi({
  bearerToken: process.env.TWITTER_BEARER_TOKEN,
});

// Query for product mentions with engagement metrics
const mentions = await client.v2.search({
  query: `"product name" lang:en`,
  'tweet.fields': 'public_metrics,created_at',
  max_results: 100,
});
```

### 3. Reddit API (Community Demand)

#### Options Evaluated

| Option | Cost | Rate Limit | Quality | Recommendation |
|--------|------|-----------|---------|-----------------|
| **Official Reddit API** | $0 | 60/min | High | ✅ Primary |
| **PRAW library** | $0 | 60/min | High | ✅ Use this |
| **Pushshift API** | $0 | ~30/min | High | ✅ Fallback |
| **Unofficial scrapers** | $0 | Risk ban | Medium | ❌ Not recommended |

**Recommendation**: **Official Reddit API + PRAW library**
- **Pros**: Free, official, well-documented, high rate limits (60/min)
- **Cons**: Need Reddit app credentials
- **Setup**: Register app at reddit.com/prefs/apps (takes 5 min)
- **Rate Limit**: 60 requests per minute per client

**Implementation**:
```typescript
// Use reddit PRAW wrapper (Node.js version: snoowrap or raw API)
import axios from 'axios';

const redditOAuth = await axios.post(
  'https://www.reddit.com/api/v1/access_token',
  new URLSearchParams({
    grant_type: 'password',
    username: process.env.REDDIT_USERNAME,
    password: process.env.REDDIT_PASSWORD,
  }),
  {
    auth: {
      username: process.env.REDDIT_CLIENT_ID,
      password: process.env.REDDIT_CLIENT_SECRET,
    },
  },
);

// Search subreddits for product mentions
const mentions = await axios.get(
  `https://oauth.reddit.com/r/subreddit/search`,
  {
    params: { q: 'product name', limit: 100 },
    headers: { Authorization: `Bearer ${token}` },
  },
);
```

### 4. TikTok API (Viral Trends)

#### Options Evaluated

| Option | Cost | Access | Rate Limit | Trending Data | Recommendation |
|--------|------|--------|-----------|---|-----------------|
| **TikTok Research API** | Free | Academic only | Custom | Limited | ❌ Research only |
| **TikTok Content API** | Free | App registration | 100/mo free | Limited | ⚠️ Restrictive |
| **Apify TikTok** | $20/mo | Easy | Custom | Yes | ✅ Best option |
| **Unofficial scrapers** | $0 | Unreliable | Risk ban | Yes | ❌ Risk ban |

**Recommendation**: **Apify TikTok Trending API** ($20-30/month)
- **Pros**: Official, reliable, no account risk, good accuracy
- **Cons**: Paid service ($20/month base)
- **Data**: Trending hashtags, videos, engagement metrics
- **Rate Limit**: Custom (typically 100-500/mo free tier included)

**Alternative if budget constrained**: Use **TikTok Content Posting API** (free tier, limited trending data) or skip TikTok initially and add later.

---

## Proposed Architecture

### 1. New Database Model: TrendCache

```prisma
// prisma/schema.prisma - ADD

model TrendCache {
  id              String   @id @default(cuid())
  productId       String
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  // Trend data (all 0-1 normalized)
  googleTrendScore Float   // Search interest
  twitterScore    Float   // Social virality
  redditScore     Float   // Community demand
  tiktokScore     Float   // Viral potential

  // Metadata
  source          String[] // ['google', 'twitter', 'reddit', 'tiktok']
  lastUpdated     DateTime
  nextUpdateAt    DateTime // Scheduled next refresh

  // Error tracking
  failedSources   String[] // Sources that failed
  errorCount      Int      @default(0)
  lastError       String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([productId])
  @@index([nextUpdateAt])  // For finding stale cache
}

model TrendDataSource {
  id              String   @id @default(cuid())
  name            String   @unique // 'google', 'twitter', 'reddit', 'tiktok'
  enabled         Boolean  @default(true)
  apiKey          String?  // Encrypted

  // Rate limiting
  dailyLimit      Int      @default(1000)
  dailyUsed       Int      @default(0)
  requestsPerMin  Int      @default(60)

  // Caching
  cacheTTLHours   Int      @default(12)  // 12-24 hours
  lastSyncAt      DateTime?

  // Status
  status          String   @default("active")  // active, paused, error
  errorMessage    String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([enabled, status])
}
```

### 2. Service Architecture

```
src/modules/product/
├── services/
│   ├── product-ranker.service.ts (MODIFY)
│   │   ├── calculateTrendScore() → calls TrendAggregator
│   │   ├── calculateViralityScore() → calls TrendAggregator
│   │   └── rankProducts() → UNCHANGED
│   │
│   ├── trend-aggregator.service.ts (NEW)
│   │   ├── aggregateTrendScores(product) → merges all sources
│   │   ├── getTrendData(product) → retrieves from cache/API
│   │   ├── shouldRefreshCache(product) → checks TTL
│   │   └── handleCacheMiss(product) → fallback strategy
│   │
│   └── trend-providers/
│       ├── google-trends.provider.ts (NEW)
│       │   ├── getTrendScore(keyword) → pytrends wrapper
│       │   ├── normalizeScore(value) → 0-1 scale
│       │   └── handleRateLimit() → backoff + retry
│       │
│       ├── twitter-trends.provider.ts (NEW)
│       │   ├── getViralityScore(product) → X API mentions
│       │   ├── calculateEngagementScore(tweets)
│       │   └── handleAuthError()
│       │
│       ├── reddit-trends.provider.ts (NEW)
│       │   ├── getRedditScore(product) → PRAW mentions
│       │   ├── countSubredditMentions(product)
│       │   └── analyzeEngagement()
│       │
│       └── tiktok-trends.provider.ts (NEW)
│           ├── getTiktokScore(product) → Apify wrapper
│           ├── getHashtagTrends()
│           └── analyzeViralPotential()

src/common/
├── cache/
│   ├── trend-cache.service.ts (NEW)
│   │   ├── get(productId)
│   │   ├── set(productId, trendData, ttl)
│   │   ├── delete(productId)
│   │   └── isCacheValid(productId) → checks TTL
│   │
│   └── trend-cache.strategy.ts (NEW)
│       └── CacheStrategy interface for redis/memory

├── rate-limiting/
│   └── trend-rate-limiter.ts (NEW)
│       ├── checkRateLimit(source) → request allowed?
│       ├── recordRequest(source) → log usage
│       └── resetDaily() → reset counters

└── circuit-breaker/
    └── (EXTEND existing)
        └── TrendCircuitBreaker
            ├── Fail-fast for unavailable APIs
            └── Fallback to cached data
```

### 3. Data Flow

```
ProductRanker.calculateScores(product)
    ↓
TrendAggregator.getTrendData(product)
    ├─ Check TrendCache (is fresh?)
    │  ├─ YES → Return cached scores
    │  └─ NO → Proceed to refresh
    │
    ├─ Check rate limits per source
    │  └─ Respect dailyLimit, requestsPerMin
    │
    ├─ Parallel fetch from enabled sources
    │  ├─ GoogleTrends.getTrendScore() → 0-1 score
    │  ├─ TwitterTrends.getViralityScore() → 0-1 score
    │  ├─ RedditTrends.getRedditScore() → 0-1 score
    │  └─ TiktokTrends.getTiktokScore() → 0-1 score
    │
    ├─ Handle failures (partial success OK)
    │  ├─ 1 source fails → use other 3
    │  ├─ 2+ sources fail → use cached value
    │  └─ All fail → return fallback 0.5
    │
    ├─ Aggregate scores (weighted average)
    │  └─ Score = (google + twitter + reddit + tiktok) / 4
    │
    ├─ Cache result (TTL: 12-24 hours)
    │  └─ TrendCache.set(productId, scores)
    │
    └─ Return aggregated score (0-1)
        ↓
    ProductRanker.calculateScores()
        ├─ trendScore (from aggregator) × 0.3
        ├─ profitScore (commission) × 0.4
        ├─ viralityScore (from aggregator) × 0.3
        └─ overallScore (weighted sum) → FINAL RANK
```

### 4. Configuration

```env
# .env additions

# TREND DATA INTEGRATION
TREND_CACHE_ENABLED=true
TREND_CACHE_TTL_HOURS=12  # 12-24 hours (default 12)
TREND_CACHE_STRATEGY=redis  # redis or memory (redis recommended)
TREND_FALLBACK_SCORE=0.5  # If all sources fail

# GOOGLE TRENDS (Pytrends)
GOOGLE_TRENDS_ENABLED=true
GOOGLE_TRENDS_BATCH_SIZE=5  # Keywords per request
GOOGLE_TRENDS_RETRY_DELAY_MS=2000  # Backoff delay
GOOGLE_TRENDS_MAX_RETRIES=3

# TWITTER/X API
TWITTER_API_ENABLED=false  # Start disabled (requires approval)
TWITTER_API_VERSION=v2
TWITTER_BEARER_TOKEN=your_token_here
TWITTER_REQUEST_LIMIT=300  # per 15 minutes
TWITTER_DAILY_LIMIT=10000

# REDDIT API
REDDIT_API_ENABLED=true
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret  # Encrypted
REDDIT_USERNAME=your_username
REDDIT_PASSWORD=your_password  # Encrypted
REDDIT_REQUEST_LIMIT=60  # per minute
REDDIT_DAILY_LIMIT=50000

# TIKTOK API
TIKTOK_API_ENABLED=false  # Paid service ($20/mo)
TIKTOK_API_ENDPOINT=https://api.apify.com/v2/...
TIKTOK_API_KEY=your_api_key  # Encrypted
TIKTOK_DAILY_LIMIT=100

# TREND MONITORING & ALERTS
TREND_UPDATE_SCHEDULE=0 0 * * *  # Daily at midnight
TREND_ALERT_THRESHOLD=0.8  # Alert if score jumps >20%
TREND_ALERT_EMAIL=admin@example.com
```

---

## Implementation Steps

### Phase 1: Setup & Infrastructure (5 hours)

#### Step 1.1: Add Database Models
**Time**: 1 hour
**Files to modify**:
- `/Users/dungngo97/Documents/ai-affiliate-empire/prisma/schema.prisma`

**Tasks**:
1. Add TrendCache model (includes productId FK, scores, TTL)
2. Add TrendDataSource model (tracks API status, rate limits)
3. Add relation to Product model
4. Create indexes on `nextUpdateAt` and `productId`
5. Run: `npx prisma migrate dev --name add_trend_models`

```prisma
model TrendCache {
  id              String   @id @default(cuid())
  productId       String   @unique
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  googleTrendScore Float   @default(0)
  twitterScore    Float    @default(0)
  redditScore     Float    @default(0)
  tiktokScore     Float    @default(0)
  source          String[]
  lastUpdated     DateTime
  nextUpdateAt    DateTime
  failedSources   String[]
  errorCount      Int      @default(0)
  lastError       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([nextUpdateAt])
}

model TrendDataSource {
  id              String   @id @default(cuid())
  name            String   @unique
  enabled         Boolean  @default(true)
  apiKey          String?
  dailyLimit      Int      @default(1000)
  dailyUsed       Int      @default(0)
  requestsPerMin  Int      @default(60)
  cacheTTLHours   Int      @default(12)
  lastSyncAt      DateTime?
  status          String   @default("active")
  errorMessage    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([enabled, status])
}
```

#### Step 1.2: Setup Environment Variables
**Time**: 30 min
**Files to create/modify**:
- `/Users/dungngo97/Documents/ai-affiliate-empire/.env.example`
- `/Users/dungngo97/Documents/ai-affiliate-empire/.env` (local)

**Tasks**:
1. Add all trend configuration variables to .env.example
2. Add secure comments explaining each setting
3. Document cost implications ($0 for Google+Reddit, $20/mo for TikTok, $200/mo optional for Twitter)

#### Step 1.3: Install Dependencies
**Time**: 30 min
**Files to modify**:
- `/Users/dungngo97/Documents/ai-affiliate-empire/package.json`

**Dependencies to add**:
```bash
npm install pytrends twitter-api-client axios dotenv
npm install --save-dev @types/node
```

**Justification**:
- `pytrends`: Free Google Trends scraping
- `twitter-api-client`: Official X API v2
- `axios`: HTTP client (already installed, verify)
- `dotenv`: Environment management (already installed, verify)

#### Step 1.4: Create Trend Service Structure
**Time**: 30 min
**Files to create**:
```
src/modules/product/services/
├── trend-aggregator.service.ts
└── trend-providers/
    ├── google-trends.provider.ts
    ├── twitter-trends.provider.ts
    ├── reddit-trends.provider.ts
    └── tiktok-trends.provider.ts

src/common/cache/
└── trend-cache.service.ts

src/common/rate-limiting/
└── trend-rate-limiter.service.ts
```

---

### Phase 2: Implement Trend Providers (25 hours)

#### Step 2.1: Google Trends Provider
**Time**: 4 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/modules/product/services/trend-providers/google-trends.provider.ts`

```typescript
// google-trends.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface GoogleTrendData {
  score: number;        // 0-100 from Google
  normalized: number;   // 0-1 normalized
  dataPoints: number;   // Historical points
  timestamp: Date;
}

@Injectable()
export class GoogleTrendsProvider {
  private readonly logger = new Logger(GoogleTrendsProvider.name);
  private readonly maxRetries = parseInt(process.env.GOOGLE_TRENDS_MAX_RETRIES || '3');
  private readonly retryDelay = parseInt(process.env.GOOGLE_TRENDS_RETRY_DELAY_MS || '2000');
  private requestQueue: Promise<any> = Promise.resolve();

  async getTrendScore(keyword: string): Promise<GoogleTrendData> {
    // Use pytrends via HTTP wrapper (Google blocks direct SDK)
    // Call external service or use process wrapper for Python

    try {
      return await this.fetchWithRetry(keyword);
    } catch (error) {
      this.logger.error('Google Trends fetch failed', {
        keyword,
        error: error.message,
      });
      throw error;
    }
  }

  private async fetchWithRetry(keyword: string): Promise<GoogleTrendData> {
    // Implement queue-based retry to respect rate limits
    // Use exponential backoff: 2s, 4s, 8s

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.requestQueue.then(() =>
          this.fetchTrend(keyword)
        );
      } catch (error) {
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          this.logger.warn(`Retrying Google Trends in ${delay}ms`, {
            keyword,
            attempt: attempt + 1,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  private async fetchTrend(keyword: string): Promise<GoogleTrendData> {
    // Option 1: Call external pytrends wrapper API
    const response = await axios.post(
      'http://localhost:3001/internal/trends/google',
      { keyword },
      { timeout: 30000 }
    );

    return {
      score: response.data.interestValue || 0,
      normalized: this.normalize(response.data.interestValue),
      dataPoints: response.data.timePoints?.length || 0,
      timestamp: new Date(),
    };
  }

  private normalize(score: number): number {
    // Google returns 0-100, normalize to 0-1
    return Math.min(score / 100, 1.0);
  }
}
```

**Subtasks**:
1. Implement Google Trends wrapper using pytrends
2. Add rate limit handling (60 req/min max)
3. Add retry logic with exponential backoff
4. Normalize scores to 0-1 range
5. Add comprehensive error handling
6. Add logging for debugging

#### Step 2.2: Twitter/X Trends Provider
**Time**: 5 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/modules/product/services/trend-providers/twitter-trends.provider.ts`

```typescript
// twitter-trends.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { TwitterApi } from 'twitter-api-client';

interface TwitterTrendData {
  mentions: number;
  engagement: number;  // likes + retweets + replies
  engagementRate: number;  // engagement / mentions
  viralityScore: number;  // 0-1
  sentiment: number;  // -1 to 1 (negative to positive)
  timestamp: Date;
}

@Injectable()
export class TwitterTrendsProvider {
  private readonly logger = new Logger(TwitterTrendsProvider.name);
  private client: TwitterApi;
  private requestCount = 0;
  private readonly requestLimitPer15Min = 300;
  private lastResetAt = Date.now();

  constructor() {
    if (process.env.TWITTER_API_ENABLED === 'true') {
      this.client = new TwitterApi({
        bearerToken: process.env.TWITTER_BEARER_TOKEN,
      });
    }
  }

  async getViralityScore(productName: string): Promise<TwitterTrendData> {
    if (!process.env.TWITTER_API_ENABLED || !this.client) {
      return this.getMockData();  // Fallback if API disabled
    }

    try {
      // Check rate limit
      if (!this.checkRateLimit()) {
        this.logger.warn('Twitter rate limit approaching');
        throw new Error('Rate limit exceeded');
      }

      // Search for mentions with engagement
      const tweets = await this.client.v2.search({
        query: `"${productName}" lang:en -is:retweet`,
        'tweet.fields': 'public_metrics,created_at,author_id',
        max_results: 100,
      });

      return this.analyzeTweets(tweets);
    } catch (error) {
      this.logger.error('Twitter API fetch failed', {
        product: productName,
        error: error.message,
      });
      throw error;
    }
  }

  private analyzeTweets(tweets: any): TwitterTrendData {
    let totalMentions = 0;
    let totalEngagement = 0;

    tweets.data?.forEach(tweet => {
      const metrics = tweet.public_metrics;
      totalMentions += 1;
      totalEngagement += (metrics.like_count || 0) +
        (metrics.retweet_count || 0) +
        (metrics.reply_count || 0);
    });

    const engagementRate = totalMentions > 0 ? totalEngagement / totalMentions : 0;
    const viralityScore = Math.min(engagementRate / 50, 1.0);  // Normalize

    return {
      mentions: totalMentions,
      engagement: totalEngagement,
      engagementRate,
      viralityScore,
      sentiment: 0.5,  // TODO: Add sentiment analysis if needed
      timestamp: new Date(),
    };
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastResetAt;

    // Reset counter every 15 minutes
    if (elapsed > 15 * 60 * 1000) {
      this.requestCount = 0;
      this.lastResetAt = now;
    }

    if (this.requestCount >= this.requestLimitPer15Min) {
      return false;
    }

    this.requestCount++;
    return true;
  }

  private getMockData(): TwitterTrendData {
    return {
      mentions: 0,
      engagement: 0,
      engagementRate: 0,
      viralityScore: 0.5,
      sentiment: 0,
      timestamp: new Date(),
    };
  }
}
```

**Subtasks**:
1. Implement Twitter API v2 client integration
2. Search for product mentions with engagement metrics
3. Calculate engagement rate (likes + retweets + replies) / mentions
4. Normalize virality score to 0-1
5. Add rate limit tracking (300 per 15 min)
6. Add graceful fallback (mock data if API disabled)
7. Add error handling for auth failures

**Note**: Start with API disabled (TWITTER_API_ENABLED=false). Users must apply for elevated access.

#### Step 2.3: Reddit Trends Provider
**Time**: 4 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/modules/product/services/trend-providers/reddit-trends.provider.ts`

```typescript
// reddit-trends.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface RedditTrendData {
  mentions: number;
  subreddits: string[];
  engagement: number;  // Total upvotes across mentions
  discussionScore: number;  // 0-1
  timestamp: Date;
}

@Injectable()
export class RedditTrendsProvider {
  private readonly logger = new Logger(RedditTrendsProvider.name);
  private accessToken: string;
  private tokenExpiresAt = 0;

  async getRedditScore(productName: string): Promise<RedditTrendData> {
    try {
      // Ensure token is fresh
      await this.refreshTokenIfNeeded();

      // Search for mentions
      const results = await this.searchReddit(productName);

      return this.analyzeResults(results);
    } catch (error) {
      this.logger.error('Reddit API fetch failed', {
        product: productName,
        error: error.message,
      });
      throw error;
    }
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.accessToken && this.tokenExpiresAt > Date.now()) {
      return;  // Token still valid
    }

    try {
      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        new URLSearchParams({
          grant_type: 'password',
          username: process.env.REDDIT_USERNAME,
          password: process.env.REDDIT_PASSWORD,
        }),
        {
          auth: {
            username: process.env.REDDIT_CLIENT_ID,
            password: process.env.REDDIT_CLIENT_SECRET,
          },
          headers: {
            'User-Agent': 'ai-affiliate-empire/1.0',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
    } catch (error) {
      this.logger.error('Reddit token refresh failed', { error: error.message });
      throw error;
    }
  }

  private async searchReddit(productName: string): Promise<any[]> {
    const response = await axios.get('https://oauth.reddit.com/r/all/search', {
      params: {
        q: `"${productName}"`,
        type: 'link,comment',
        limit: 100,
        sort: 'new',
      },
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'User-Agent': 'ai-affiliate-empire/1.0',
      },
      timeout: 30000,
    });

    return response.data.data.children || [];
  }

  private analyzeResults(results: any[]): RedditTrendData {
    const subreddits = new Set<string>();
    let totalEngagement = 0;

    results.forEach(item => {
      const data = item.data;
      subreddits.add(data.subreddit);
      totalEngagement += data.ups || 0;
    });

    const discussionScore = Math.min(totalEngagement / 1000, 1.0);  // Normalize

    return {
      mentions: results.length,
      subreddits: Array.from(subreddits),
      engagement: totalEngagement,
      discussionScore,
      timestamp: new Date(),
    };
  }
}
```

**Subtasks**:
1. Implement Reddit OAuth flow
2. Add token refresh logic
3. Search for product mentions across subreddits
4. Calculate engagement (upvotes) score
5. Track relevant subreddits
6. Normalize discussion score to 0-1
7. Handle rate limits (60 per min)
8. Add error handling for auth failures

#### Step 2.4: TikTok Trends Provider
**Time**: 3 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/modules/product/services/trend-providers/tiktok-trends.provider.ts`

```typescript
// tiktok-trends.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface TikTokTrendData {
  videos: number;
  views: number;
  engagement: number;
  viralityScore: number;  // 0-1
  hashtags: string[];
  timestamp: Date;
}

@Injectable()
export class TiktokTrendsProvider {
  private readonly logger = new Logger(TiktokTrendsProvider.name);

  async getTiktokScore(productName: string): Promise<TikTokTrendData> {
    if (process.env.TIKTOK_API_ENABLED !== 'true') {
      return this.getMockData();  // TikTok API is paid
    }

    try {
      // Use Apify TikTok API
      const videos = await this.searchTiktok(productName);
      return this.analyzeVideos(videos);
    } catch (error) {
      this.logger.error('TikTok API fetch failed', {
        product: productName,
        error: error.message,
      });
      throw error;
    }
  }

  private async searchTiktok(keyword: string): Promise<any[]> {
    const response = await axios.post(
      'https://api.apify.com/v2/acts/novi~tiktok-video-downloader/runs',
      {
        searchQuery: keyword,
        resultsLimit: 100,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TIKTOK_API_KEY}`,
        },
        timeout: 60000,
      }
    );

    // Wait for results if async
    if (response.data.status === 'RUNNING') {
      return await this.pollResults(response.data.id);
    }

    return response.data.results || [];
  }

  private async pollResults(runId: string): Promise<any[]> {
    for (let i = 0; i < 30; i++) {
      const response = await axios.get(
        `https://api.apify.com/v2/acts/novi~tiktok-video-downloader/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.TIKTOK_API_KEY}`,
          },
        }
      );

      if (response.data.status === 'SUCCEEDED') {
        return response.data.output?.results || [];
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('TikTok API timeout');
  }

  private analyzeVideos(videos: any[]): TikTokTrendData {
    let totalViews = 0;
    let totalEngagement = 0;
    const hashtags = new Set<string>();

    videos.forEach(video => {
      totalViews += video.viewCount || 0;
      totalEngagement += (video.likeCount || 0) +
        (video.shareCount || 0) +
        (video.commentCount || 0);

      video.hashtags?.forEach(tag => hashtags.add(tag));
    });

    const viralityScore = Math.min(totalViews / 100000, 1.0);  // Normalize

    return {
      videos: videos.length,
      views: totalViews,
      engagement: totalEngagement,
      viralityScore,
      hashtags: Array.from(hashtags),
      timestamp: new Date(),
    };
  }

  private getMockData(): TikTokTrendData {
    return {
      videos: 0,
      views: 0,
      engagement: 0,
      viralityScore: 0.5,
      hashtags: [],
      timestamp: new Date(),
    };
  }
}
```

**Subtasks**:
1. Implement Apify TikTok API wrapper
2. Add async polling for results
3. Track video counts, views, engagement
4. Extract trending hashtags
5. Normalize virality score to 0-1
6. Add graceful fallback (mock data if disabled)
7. Start with API disabled (paid service - $20/mo)

---

### Phase 3: Implement Trend Aggregator (15 hours)

#### Step 3.1: Trend Cache Service
**Time**: 3 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/common/cache/trend-cache.service.ts`

```typescript
// trend-cache.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from './cache.service';  // Existing

interface CachedTrendData {
  scores: {
    googleTrendScore: number;
    twitterScore: number;
    redditScore: number;
    tiktokScore: number;
  };
  source: string[];
  failedSources: string[];
  timestamp: Date;
}

@Injectable()
export class TrendCacheService {
  private readonly TTL_HOURS = parseInt(process.env.TREND_CACHE_TTL_HOURS || '12');
  private readonly TTL_MS = this.TTL_HOURS * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async get(productId: string): Promise<CachedTrendData | null> {
    // Try Redis first (fast)
    const cached = await this.cache.get(`trend:${productId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to database
    const dbCache = await this.prisma.trendCache.findUnique({
      where: { productId },
    });

    if (dbCache && this.isValid(dbCache.nextUpdateAt)) {
      // Restore to Redis
      await this.cache.set(
        `trend:${productId}`,
        JSON.stringify(dbCache),
        this.TTL_MS
      );
      return dbCache as CachedTrendData;
    }

    return null;
  }

  async set(
    productId: string,
    data: CachedTrendData
  ): Promise<void> {
    const nextUpdateAt = new Date(Date.now() + this.TTL_MS);

    // Update database
    await this.prisma.trendCache.upsert({
      where: { productId },
      create: {
        productId,
        googleTrendScore: data.scores.googleTrendScore,
        twitterScore: data.scores.twitterScore,
        redditScore: data.scores.redditScore,
        tiktokScore: data.scores.tiktokScore,
        source: data.source,
        failedSources: data.failedSources,
        lastUpdated: new Date(),
        nextUpdateAt,
      },
      update: {
        googleTrendScore: data.scores.googleTrendScore,
        twitterScore: data.scores.twitterScore,
        redditScore: data.scores.redditScore,
        tiktokScore: data.scores.tiktokScore,
        source: data.source,
        failedSources: data.failedSources,
        lastUpdated: new Date(),
        nextUpdateAt,
        errorCount: 0,
        lastError: null,
      },
    });

    // Update Redis
    await this.cache.set(
      `trend:${productId}`,
      JSON.stringify(data),
      this.TTL_MS
    );
  }

  async delete(productId: string): Promise<void> {
    await this.prisma.trendCache.delete({
      where: { productId },
    });
    await this.cache.delete(`trend:${productId}`);
  }

  isValid(nextUpdateAt: Date): boolean {
    return nextUpdateAt > new Date();
  }

  async getNeedingRefresh(): Promise<string[]> {
    // Find products with stale cache
    const stale = await this.prisma.trendCache.findMany({
      where: {
        nextUpdateAt: { lt: new Date() },
      },
      select: { productId: true },
    });

    return stale.map(s => s.productId);
  }
}
```

**Subtasks**:
1. Implement dual-layer cache (Redis + DB)
2. Add TTL validation
3. Implement cache miss detection
4. Add background refresh queries
5. Implement cache invalidation

#### Step 3.2: Trend Rate Limiter Service
**Time**: 2 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/common/rate-limiting/trend-rate-limiter.service.ts`

```typescript
// trend-rate-limiter.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TrendRateLimiter {
  constructor(private readonly prisma: PrismaService) {}

  async canMakeRequest(sourceName: string): Promise<boolean> {
    const source = await this.prisma.trendDataSource.findUnique({
      where: { name: sourceName },
    });

    if (!source || !source.enabled) {
      return false;
    }

    // Check daily limit
    if (source.dailyUsed >= source.dailyLimit) {
      return false;
    }

    return true;
  }

  async recordRequest(sourceName: string): Promise<void> {
    await this.prisma.trendDataSource.update({
      where: { name: sourceName },
      data: {
        dailyUsed: {
          increment: 1,
        },
      },
    });
  }

  async resetDaily(): Promise<void> {
    // Run daily (via cron job)
    await this.prisma.trendDataSource.updateMany({
      data: {
        dailyUsed: 0,
      },
    });
  }

  async updateSourceStatus(
    sourceName: string,
    status: 'active' | 'paused' | 'error',
    errorMessage?: string
  ): Promise<void> {
    await this.prisma.trendDataSource.update({
      where: { name: sourceName },
      data: {
        status,
        errorMessage,
        lastSyncAt: new Date(),
      },
    });
  }
}
```

**Subtasks**:
1. Implement daily limit tracking
2. Add enable/disable per source
3. Add error status tracking
4. Implement daily reset logic

#### Step 3.3: Trend Aggregator Service
**Time**: 10 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/modules/product/services/trend-aggregator.service.ts`

```typescript
// trend-aggregator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { GoogleTrendsProvider } from './trend-providers/google-trends.provider';
import { TwitterTrendsProvider } from './trend-providers/twitter-trends.provider';
import { RedditTrendsProvider } from './trend-providers/reddit-trends.provider';
import { TiktokTrendsProvider } from './trend-providers/tiktok-trends.provider';
import { TrendCacheService } from '../../common/cache/trend-cache.service';
import { TrendRateLimiter } from '../../common/rate-limiting/trend-rate-limiter.service';

interface Product {
  id: string;
  title: string;
  category: string;
  brand: string;
}

interface AggregatedScore {
  googleTrendScore: number;
  twitterScore: number;
  redditScore: number;
  tiktokScore: number;
  aggregatedScore: number;
  source: string[];
  failedSources: string[];
}

@Injectable()
export class TrendAggregatorService {
  private readonly logger = new Logger(TrendAggregatorService.name);
  private readonly FALLBACK_SCORE = 0.5;

  constructor(
    private readonly googleProvider: GoogleTrendsProvider,
    private readonly twitterProvider: TwitterTrendsProvider,
    private readonly redditProvider: RedditTrendsProvider,
    private readonly tiktokProvider: TiktokTrendsProvider,
    private readonly cache: TrendCacheService,
    private readonly rateLimiter: TrendRateLimiter,
  ) {}

  async getTrendScores(product: Product): Promise<AggregatedScore> {
    // Try cache first
    const cached = await this.cache.get(product.id);
    if (cached) {
      this.logger.debug(`Trend cache hit for product ${product.id}`);
      return this.normalizeCachedData(cached);
    }

    // Cache miss - fetch from APIs
    this.logger.debug(`Trend cache miss for product ${product.id}`);
    return await this.fetchAndAggregate(product);
  }

  private async fetchAndAggregate(product: Product): Promise<AggregatedScore> {
    const results = {
      googleTrendScore: this.FALLBACK_SCORE,
      twitterScore: this.FALLBACK_SCORE,
      redditScore: this.FALLBACK_SCORE,
      tiktokScore: this.FALLBACK_SCORE,
      source: [] as string[],
      failedSources: [] as string[],
    };

    // Fetch all sources in parallel
    const [googleResult, twitterResult, redditResult, tiktokResult] = await Promise.allSettled([
      this.fetchGoogleTrends(product),
      this.fetchTwitterTrends(product),
      this.fetchRedditTrends(product),
      this.fetchTiktokTrends(product),
    ]);

    // Process results
    if (googleResult.status === 'fulfilled') {
      results.googleTrendScore = googleResult.value;
      results.source.push('google');
    } else {
      results.failedSources.push('google');
      this.logger.warn(`Google Trends failed for ${product.title}`);
    }

    if (twitterResult.status === 'fulfilled') {
      results.twitterScore = twitterResult.value;
      results.source.push('twitter');
    } else {
      results.failedSources.push('twitter');
      this.logger.warn(`Twitter API failed for ${product.title}`);
    }

    if (redditResult.status === 'fulfilled') {
      results.redditScore = redditResult.value;
      results.source.push('reddit');
    } else {
      results.failedSources.push('reddit');
      this.logger.warn(`Reddit API failed for ${product.title}`);
    }

    if (tiktokResult.status === 'fulfilled') {
      results.tiktokScore = tiktokResult.value;
      results.source.push('tiktok');
    } else {
      results.failedSources.push('tiktok');
      this.logger.warn(`TikTok API failed for ${product.title}`);
    }

    // Fallback: if too many sources failed, return last cached or default
    if (results.source.length === 0) {
      this.logger.error(`All trend sources failed for ${product.title}`);
      results.googleTrendScore = this.FALLBACK_SCORE;
      results.twitterScore = this.FALLBACK_SCORE;
      results.redditScore = this.FALLBACK_SCORE;
      results.tiktokScore = this.FALLBACK_SCORE;
    }

    // Aggregate scores (equal weighting or configurable)
    results.aggregatedScore = (
      results.googleTrendScore +
      results.twitterScore +
      results.redditScore +
      results.tiktokScore
    ) / 4;

    // Cache result
    await this.cache.set(product.id, {
      scores: {
        googleTrendScore: results.googleTrendScore,
        twitterScore: results.twitterScore,
        redditScore: results.redditScore,
        tiktokScore: results.tiktokScore,
      },
      source: results.source,
      failedSources: results.failedSources,
      timestamp: new Date(),
    });

    return {
      ...results,
      aggregatedScore: results.aggregatedScore,
    };
  }

  private async fetchGoogleTrends(product: Product): Promise<number> {
    if (!await this.rateLimiter.canMakeRequest('google')) {
      this.logger.warn('Google Trends rate limit exceeded');
      return this.FALLBACK_SCORE;
    }

    const data = await this.googleProvider.getTrendScore(product.title);
    await this.rateLimiter.recordRequest('google');
    return data.normalized;
  }

  private async fetchTwitterTrends(product: Product): Promise<number> {
    if (!await this.rateLimiter.canMakeRequest('twitter')) {
      this.logger.warn('Twitter rate limit exceeded');
      return this.FALLBACK_SCORE;
    }

    const data = await this.twitterProvider.getViralityScore(product.title);
    await this.rateLimiter.recordRequest('twitter');
    return data.viralityScore;
  }

  private async fetchRedditTrends(product: Product): Promise<number> {
    if (!await this.rateLimiter.canMakeRequest('reddit')) {
      this.logger.warn('Reddit rate limit exceeded');
      return this.FALLBACK_SCORE;
    }

    const data = await this.redditProvider.getRedditScore(product.title);
    await this.rateLimiter.recordRequest('reddit');
    return data.discussionScore;
  }

  private async fetchTiktokTrends(product: Product): Promise<number> {
    if (!await this.rateLimiter.canMakeRequest('tiktok')) {
      this.logger.warn('TikTok rate limit exceeded');
      return this.FALLBACK_SCORE;
    }

    const data = await this.tiktokTrendsProvider.getTiktokScore(product.title);
    await this.rateLimiter.recordRequest('tiktok');
    return data.viralityScore;
  }

  private normalizeCachedData(cached: any): AggregatedScore {
    const aggregated = (
      cached.googleTrendScore +
      cached.twitterScore +
      cached.redditScore +
      cached.tiktokScore
    ) / 4;

    return {
      googleTrendScore: cached.googleTrendScore,
      twitterScore: cached.twitterScore,
      redditScore: cached.redditScore,
      tiktokScore: cached.tiktokScore,
      aggregatedScore: aggregated,
      source: cached.source,
      failedSources: cached.failedSources,
    };
  }
}
```

**Subtasks**:
1. Implement parallel API fetching
2. Add graceful failure handling
3. Implement score aggregation (equal weighting)
4. Add fallback score logic
5. Implement caching integration
6. Add rate limit checking
7. Add comprehensive logging

---

### Phase 4: Integrate with ProductRanker (8 hours)

#### Step 4.1: Update ProductRankerService
**Time**: 4 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/modules/product/services/product-ranker.service.ts`

**Changes**:
1. Inject TrendAggregatorService
2. Update calculateTrendScore() to call aggregator
3. Update calculateViralityScore() to call aggregator
4. Keep profit score calculation unchanged
5. Update overall score calculation

```typescript
// MODIFY: product-ranker.service.ts

import { Injectable } from '@nestjs/common';
import { TrendAggregatorService } from './trend-aggregator.service';

interface Product {
  id: string;
  title: string;
  price: number;
  commission: number;
  category?: string;
  brand?: string;
}

interface RankingScores {
  trendScore: number;
  profitScore: number;
  viralityScore: number;
  overallScore: number;
  trendSources?: string[];  // NEW: Track which sources were used
}

@Injectable()
export class ProductRanker {
  private readonly TREND_WEIGHT = 0.3;
  private readonly PROFIT_WEIGHT = 0.4;
  private readonly VIRALITY_WEIGHT = 0.3;

  constructor(
    private readonly trendAggregator: TrendAggregatorService,
  ) {}

  async calculateScores(product: Product): Promise<RankingScores> {
    // Get real trend data from aggregator
    const trendData = await this.trendAggregator.getTrendScores(product);

    const trendScore = trendData.googleTrendScore;  // Search interest
    const profitScore = this.calculateProfitScore(product);
    const viralityScore = trendData.aggregatedScore;  // Combined social score

    const overallScore =
      trendScore * this.TREND_WEIGHT +
      profitScore * this.PROFIT_WEIGHT +
      viralityScore * this.VIRALITY_WEIGHT;

    return {
      trendScore,
      profitScore,
      viralityScore,
      overallScore,
      trendSources: trendData.source,
    };
  }

  private calculateProfitScore(product: Product): number {
    const commissionAmount = (product.price * product.commission) / 100;
    let score = commissionAmount / 10;
    score = Math.min(score, 1.0);

    if (product.commission > 5) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  async rankProducts(products: Product[]): Promise<(Product & RankingScores)[]> {
    const scored = await Promise.all(
      products.map(async (product) => {
        const scores = await this.calculateScores(product);
        return {
          ...product,
          ...scores,
        };
      }),
    );

    return scored.sort((a, b) => b.overallScore - a.overallScore);
  }
}
```

#### Step 4.2: Update ProductModule
**Time**: 2 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/modules/product/product.module.ts`

**Changes**:
1. Import TrendAggregatorService
2. Add all trend providers
3. Add trend cache service
4. Add rate limiter service

```typescript
// MODIFY: product.module.ts

import { Module } from '@nestjs/common';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';
import { ProductRanker } from './services/product-ranker.service';
import { TrendAggregatorService } from './services/trend-aggregator.service';
import { GoogleTrendsProvider } from './services/trend-providers/google-trends.provider';
import { TwitterTrendsProvider } from './services/trend-providers/twitter-trends.provider';
import { RedditTrendsProvider } from './services/trend-providers/reddit-trends.provider';
import { TiktokTrendsProvider } from './services/trend-providers/tiktok-trends.provider';
import { TrendCacheService } from '../../common/cache/trend-cache.service';
import { TrendRateLimiter } from '../../common/rate-limiting/trend-rate-limiter.service';

@Module({
  controllers: [ProductController],
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
  exports: [ProductService, ProductRanker],
})
export class ProductModule {}
```

#### Step 4.3: Add Trend Update Scheduler (Optional but Recommended)
**Time**: 2 hours
**File**: `/Users/dungngo97/Documents/ai-affiliate-empire/src/modules/product/services/trend-updater.service.ts`

**Purpose**: Proactively refresh stale trends so ProductRanker doesn't block on cold cache misses

```typescript
// trend-updater.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { TrendAggregatorService } from './trend-aggregator.service';

@Injectable()
export class TrendUpdaterService {
  private readonly logger = new Logger(TrendUpdaterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trendAggregator: TrendAggregatorService,
  ) {}

  @Cron('0 0 * * *')  // Daily at midnight
  async refreshTrendCache(): Promise<void> {
    this.logger.log('Starting daily trend cache refresh');

    try {
      // Find products with stale cache
      const staleCache = await this.prisma.trendCache.findMany({
        where: {
          nextUpdateAt: { lt: new Date() },
        },
        include: {
          product: true,
        },
        take: 100,  // Limit batch size
      });

      for (const cache of staleCache) {
        try {
          await this.trendAggregator.getTrendScores(cache.product);
          this.logger.debug(`Refreshed trends for ${cache.product.title}`);
        } catch (error) {
          this.logger.error(
            `Failed to refresh trends for ${cache.product.title}`,
            error
          );
        }
      }

      this.logger.log(`Trend cache refresh completed: ${staleCache.length} products`);
    } catch (error) {
      this.logger.error('Trend cache refresh failed', error);
    }
  }
}
```

---

### Phase 5: Testing & Optimization (12 hours)

#### Step 5.1: Unit Tests for Trend Providers
**Time**: 5 hours
**Files to create**:
```
test/unit/product/services/
├── trend-aggregator.service.spec.ts
├── trend-providers/
│   ├── google-trends.provider.spec.ts
│   ├── twitter-trends.provider.spec.ts
│   ├── reddit-trends.provider.spec.ts
│   └── tiktok-trends.provider.spec.ts
```

**Testing approach**:
1. Mock API responses
2. Test score normalization (0-1 range)
3. Test error handling and fallbacks
4. Test rate limit checking
5. Test caching behavior

**Example**:
```typescript
// trend-aggregator.service.spec.ts
describe('TrendAggregatorService', () => {
  let service: TrendAggregatorService;
  let googleProvider: MockGoogleTrendsProvider;
  let cacheService: MockCacheService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TrendAggregatorService,
        { provide: GoogleTrendsProvider, useValue: googleProvider },
        { provide: TrendCacheService, useValue: cacheService },
        // ... other mocks
      ],
    }).compile();

    service = module.get(TrendAggregatorService);
  });

  it('should aggregate scores from all sources', async () => {
    const product = { id: '1', title: 'iPhone 15', category: 'Electronics' };

    const scores = await service.getTrendScores(product);

    expect(scores.aggregatedScore).toBeGreaterThanOrEqual(0);
    expect(scores.aggregatedScore).toBeLessThanOrEqual(1);
    expect(scores.source.length).toBeGreaterThan(0);
  });

  it('should use cache if valid', async () => {
    // First call - cache miss
    await service.getTrendScores(product);

    // Second call - should hit cache
    const scores = await service.getTrendScores(product);

    expect(cacheService.get).toHaveBeenCalled();
  });

  it('should fallback if all sources fail', async () => {
    googleProvider.getTrendScore.mockRejectedValue(new Error());
    // ... mock other providers to fail

    const scores = await service.getTrendScores(product);

    expect(scores.aggregatedScore).toBe(0.5);  // Fallback
  });
});
```

#### Step 5.2: Integration Tests
**Time**: 4 hours
**File**: `test/integration/product/trend-integration.spec.ts`

**Tests**:
1. End-to-end trend scoring (database → cache → API → product ranking)
2. Rate limit enforcement
3. Cache refresh lifecycle
4. Multiple product batch scoring
5. API failure scenarios

#### Step 5.3: Performance Testing
**Time**: 3 hours

**Tests**:
1. Measure latency: Cold cache miss (API calls) vs cache hit
2. Cache hit rate target: >85% after 24 hours
3. Memory usage with large caches
4. Concurrent request handling (1000+ products)
5. API timeout handling

**Benchmarks to track**:
- Cache hit latency: <10ms
- Cold cache (API call) latency: <5s (with retries)
- Overall product ranking time: <30s (100 products)

---

### Phase 6: Documentation & Deployment (5 hours)

#### Step 6.1: Documentation
**Time**: 2 hours
**Files to create**:
- `docs/trend-data-integration.md` - Architecture & usage
- `docs/guides/trend-setup.md` - Setup instructions for each API

**Topics**:
1. Overview of trend scoring
2. API setup instructions (free vs paid)
3. Rate limits and costs
4. Troubleshooting guide
5. Cache behavior and TTLs
6. Cost tracking ($0-80/month)

#### Step 6.2: Environment Setup Guide
**Time**: 1 hour

**Documented for each API**:
- Google Trends: Free (no setup needed)
- Twitter/X: How to apply for API access
- Reddit: How to create app credentials
- TikTok: How to enable (paid - $20/mo)

#### Step 6.3: Monitoring & Alerting
**Time**: 2 hours

**Add to monitoring dashboard**:
1. Trend score distribution (histogram)
2. API availability per source
3. Cache hit rate
4. Rate limit usage
5. Failed sources percentage
6. Average time per product ranking

---

## Files to Create/Modify

### New Files (20 total)

#### Database Migrations
- `prisma/migrations/[timestamp]_add_trend_models/migration.sql`

#### Core Services (8 files)
1. `src/modules/product/services/trend-aggregator.service.ts`
2. `src/modules/product/services/trend-updater.service.ts`
3. `src/modules/product/services/trend-providers/google-trends.provider.ts`
4. `src/modules/product/services/trend-providers/twitter-trends.provider.ts`
5. `src/modules/product/services/trend-providers/reddit-trends.provider.ts`
6. `src/modules/product/services/trend-providers/tiktok-trends.provider.ts`
7. `src/common/cache/trend-cache.service.ts`
8. `src/common/rate-limiting/trend-rate-limiter.service.ts`

#### Tests (6 files)
9. `test/unit/product/services/trend-aggregator.service.spec.ts`
10. `test/unit/product/services/trend-providers/google-trends.provider.spec.ts`
11. `test/unit/product/services/trend-providers/twitter-trends.provider.spec.ts`
12. `test/unit/product/services/trend-providers/reddit-trends.provider.spec.ts`
13. `test/unit/product/services/trend-providers/tiktok-trends.provider.spec.ts`
14. `test/integration/product/trend-integration.spec.ts`

#### Documentation (4 files)
15. `docs/trend-data-integration.md`
16. `docs/guides/trend-setup.md`
17. `docs/guides/trend-api-setup-by-provider.md`
18. `docs/reports/trend-integration-implementation-report.md`

#### Configuration (2 files)
19. `.env.example` - (MODIFY) Add trend variables
20. `config/trend-config.ts` - (NEW) Centralized config

### Modified Files (5 total)

1. `src/modules/product/services/product-ranker.service.ts`
   - Remove placeholder trend score generation
   - Inject TrendAggregatorService
   - Update calculateTrendScore() and calculateViralityScore()

2. `src/modules/product/product.module.ts`
   - Add new service providers

3. `prisma/schema.prisma`
   - Add TrendCache model
   - Add TrendDataSource model
   - Add Product → TrendCache relation

4. `package.json`
   - Add dependencies: pytrends, twitter-api-client

5. `src/app.module.ts` (or scheduler config)
   - Register TrendUpdaterService with @Cron decorator

---

## Cost Breakdown

### Initial Setup: $0
- Google Trends (pytrends): Free
- Reddit API: Free (requires app registration)
- Twitter/X API: Free tier available (elevated access $200/mo optional)
- TikTok API: Paid ($20/mo)

### Monthly Operating Costs

| Source | Cost | Request Budget | Recommendation |
|--------|------|-----------------|-----------------|
| Google Trends | $0 | ~90K/mo | Start with this |
| Reddit API | $0 | ~2.7M/mo | Use freely |
| Twitter/X | $0-200 | Free or high | Start with free, upgrade if needed |
| TikTok | $20/mo | ~100/mo | Add later if budget allows |
| **TOTAL** | **$20/mo** | — | **Start at $0, grow to $20** |

**Recommendation**: Start with Google Trends + Reddit (free), add Twitter when API approved, add TikTok if budget allows.

---

## Timeline & Effort Estimates

### Phase Breakdown

| Phase | Hours | Days | Status |
|-------|-------|------|--------|
| Phase 1: Setup | 5 | 1 | Implementation ready |
| Phase 2: Providers | 25 | 3-4 | Implementation ready |
| Phase 3: Aggregator | 15 | 2 | Implementation ready |
| Phase 4: Integration | 8 | 1 | Implementation ready |
| Phase 5: Testing | 12 | 2 | Testing ready |
| Phase 6: Docs | 5 | 1 | Documentation ready |
| **TOTAL** | **70 hours** | **10 days** | **Ready** |

### Recommended Schedule

**Week 1** (40 hours - 5 days):
- Day 1: Phase 1 (Setup)
- Days 2-4: Phase 2 (Trend Providers)
- Day 5: Phase 3 (Aggregator)

**Week 2** (30 hours - 4 days):
- Day 1: Phase 4 (Integration)
- Days 2-3: Phase 5 (Testing)
- Day 4: Phase 6 (Documentation)

**Week 3** (optional):
- Optimization based on testing results
- Performance tuning
- Production deployment

---

## Risk Mitigation

### Risk 1: API Rate Limits
**Risk**: Hit rate limits and API blocks
**Mitigation**:
- Implement rate limit tracking per source
- Add backoff/retry logic
- Use caching to minimize API calls
- Monitor daily usage vs limits
- **Action**: Add alerting if usage >80% of limit

### Risk 2: API Outages
**Risk**: Trend APIs unavailable, blocking product ranking
**Mitigation**:
- Graceful fallback to cached data
- Circuit breaker pattern
- 50% fallback score if all sources fail
- **Action**: Monitor API health, route to incident alerts

### Risk 3: Maintenance Burden (Pytrends)
**Risk**: Pytrends is unmaintained (archived 2025-04-17)
**Mitigation**:
- Keep fallback to Apify Google Trends API
- Monitor for Google blocking scraping
- Ready to switch to paid service if needed
- **Action**: Quarterly check for pytrends issues

### Risk 4: Cost Creep
**Risk**: Paid APIs grow beyond budget ($80+/mo)
**Mitigation**:
- Start with free APIs only ($0)
- Gradual rollout of paid services
- Daily spend tracking & alerts
- **Action**: Budget cap at $100/mo, alert at $80

### Risk 5: Data Quality
**Risk**: Trend scores not correlated with actual product sales
**Mitigation**:
- A/B test with real conversion data
- Track which trend sources have best ROI
- Adjust weights based on performance
- **Action**: Weekly A/B test, monthly adjustment

---

## Success Metrics

### Implementation Success
✅ Trend scores are no longer all 0.5 (currently)
✅ Product ranking changes based on social trends
✅ Cache hit rate >85% within 24 hours
✅ API rate limits not exceeded
✅ All tests pass (unit + integration)

### Business Success
✅ Product ranking accuracy improves (measure with A/B test)
✅ Higher conversion rates on trended products
✅ Reduced manual product selection
✅ Cost per ranking <$0.01

### Performance Success
✅ Cold cache: <5s per product (with retries)
✅ Cache hit: <10ms per product
✅ Overall ranking: <30s for 100 products
✅ Memory: <100MB for cache

---

## Unresolved Questions

1. **Should we implement Google Trends API scraping via pytrends or use official Apify service from day 1?**
   - Current recommendation: pytrends (free) with Apify as fallback
   - Alternative: Start with Apify for reliability (costs $10/mo)

2. **Twitter API access approval timeline?**
   - Requires elevated access approval from X
   - Should we request now or implement Reddit+Google first?
   - Current recommendation: Implement now but start disabled

3. **TikTok API: Is $20/month justified or skip initially?**
   - TikTok has young, trend-conscious audience (high virality)
   - But only if products are visual/lifestyle focused
   - Current recommendation: Skip initially, add if A/B tests show value

4. **Score aggregation: Equal weighting or optimize per source?**
   - Currently: (google + twitter + reddit + tiktok) / 4
   - Alternative: Machine learning to learn optimal weights
   - Current recommendation: Equal weighting, optimize later with A/B tests

5. **Cache TTL: 12 hours optimal or adjust per product category?**
   - Fast-moving categories (fashion, gadgets): 6-12 hours
   - Slow-moving (home goods): 24 hours
   - Current recommendation: Start with 12 hours globally, optimize later

---

**Created**: 2025-11-01
**Status**: Ready for Implementation
**Next Step**: Start Phase 1 (Setup) with database migrations and environment configuration
