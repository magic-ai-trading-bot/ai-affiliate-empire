import { Injectable, Logger } from '@nestjs/common';
import { GoogleTrendsProvider } from './trend-providers/google-trends.provider';
import { TwitterTrendsProvider } from './trend-providers/twitter-trends.provider';
import { RedditTrendsProvider } from './trend-providers/reddit-trends.provider';
import { TiktokTrendsProvider } from './trend-providers/tiktok-trends.provider';
import { TrendCacheService } from '../../../common/cache/trend-cache.service';
import { TrendRateLimiterService } from '../../../common/rate-limiting/trend-rate-limiter.service';

interface Product {
  id: string;
  title: string;
  category?: string;
  brand?: string;
}

export interface AggregatedScore {
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
  private readonly FALLBACK_SCORE = parseFloat(process.env.TREND_FALLBACK_SCORE || '0.5');

  constructor(
    private readonly googleProvider: GoogleTrendsProvider,
    private readonly twitterProvider: TwitterTrendsProvider,
    private readonly redditProvider: RedditTrendsProvider,
    private readonly tiktokProvider: TiktokTrendsProvider,
    private readonly cache: TrendCacheService,
    private readonly rateLimiter: TrendRateLimiterService,
  ) {}

  /**
   * Get aggregated trend scores for a product
   */
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

  /**
   * Fetch trend data from all sources and aggregate
   */
  private async fetchAndAggregate(product: Product): Promise<AggregatedScore> {
    const results: AggregatedScore = {
      googleTrendScore: this.FALLBACK_SCORE,
      twitterScore: this.FALLBACK_SCORE,
      redditScore: this.FALLBACK_SCORE,
      tiktokScore: this.FALLBACK_SCORE,
      aggregatedScore: this.FALLBACK_SCORE,
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

    // Process Google Trends result
    if (googleResult.status === 'fulfilled') {
      results.googleTrendScore = googleResult.value;
      results.source.push('google');
    } else {
      results.failedSources.push('google');
      this.logger.warn(`Google Trends failed for ${product.title}`, {
        error: googleResult.reason?.message,
      });
    }

    // Process Twitter result
    if (twitterResult.status === 'fulfilled') {
      results.twitterScore = twitterResult.value;
      results.source.push('twitter');
    } else {
      results.failedSources.push('twitter');
      this.logger.warn(`Twitter API failed for ${product.title}`, {
        error: twitterResult.reason?.message,
      });
    }

    // Process Reddit result
    if (redditResult.status === 'fulfilled') {
      results.redditScore = redditResult.value;
      results.source.push('reddit');
    } else {
      results.failedSources.push('reddit');
      this.logger.warn(`Reddit API failed for ${product.title}`, {
        error: redditResult.reason?.message,
      });
    }

    // Process TikTok result
    if (tiktokResult.status === 'fulfilled') {
      results.tiktokScore = tiktokResult.value;
      results.source.push('tiktok');
    } else {
      results.failedSources.push('tiktok');
      this.logger.warn(`TikTok API failed for ${product.title}`, {
        error: tiktokResult.reason?.message,
      });
    }

    // Handle complete failure
    if (results.source.length === 0) {
      this.logger.error(`All trend sources failed for ${product.title}`);
      // Use fallback scores (already set to FALLBACK_SCORE)
    }

    // Calculate aggregated score (weighted average)
    // Equal weighting by default, but can be adjusted
    const weights = {
      google: 0.3, // Search interest
      twitter: 0.25, // Social virality
      reddit: 0.25, // Community discussion
      tiktok: 0.2, // Viral video content
    };

    results.aggregatedScore =
      results.googleTrendScore * weights.google +
      results.twitterScore * weights.twitter +
      results.redditScore * weights.reddit +
      results.tiktokScore * weights.tiktok;

    // Cache the result
    try {
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
    } catch (error) {
      this.logger.error(`Failed to cache trend data for ${product.id}`, error);
    }

    this.logger.debug(`Trend scores aggregated for ${product.title}`, {
      scores: results,
    });

    return {
      ...results,
      aggregatedScore: results.aggregatedScore,
    };
  }

  /**
   * Fetch Google Trends data
   */
  private async fetchGoogleTrends(product: Product): Promise<number> {
    if (!(await this.rateLimiter.canMakeRequest('google'))) {
      this.logger.warn('Google Trends rate limit exceeded');
      return this.FALLBACK_SCORE;
    }

    try {
      const data = await this.googleProvider.getTrendScore(product.title);
      await this.rateLimiter.recordRequest('google');
      return data.normalized;
    } catch (error) {
      await this.rateLimiter.updateSourceStatus('google', 'error', error.message);
      throw error;
    }
  }

  /**
   * Fetch Twitter trends data
   */
  private async fetchTwitterTrends(product: Product): Promise<number> {
    if (!(await this.rateLimiter.canMakeRequest('twitter'))) {
      this.logger.warn('Twitter rate limit exceeded');
      return this.FALLBACK_SCORE;
    }

    try {
      const data = await this.twitterProvider.getViralityScore(product.title);
      await this.rateLimiter.recordRequest('twitter');
      return data.viralityScore;
    } catch (error) {
      await this.rateLimiter.updateSourceStatus('twitter', 'error', error.message);
      throw error;
    }
  }

  /**
   * Fetch Reddit trends data
   */
  private async fetchRedditTrends(product: Product): Promise<number> {
    if (!(await this.rateLimiter.canMakeRequest('reddit'))) {
      this.logger.warn('Reddit rate limit exceeded');
      return this.FALLBACK_SCORE;
    }

    try {
      const data = await this.redditProvider.getRedditScore(product.title);
      await this.rateLimiter.recordRequest('reddit');
      return data.discussionScore;
    } catch (error) {
      await this.rateLimiter.updateSourceStatus('reddit', 'error', error.message);
      throw error;
    }
  }

  /**
   * Fetch TikTok trends data
   */
  private async fetchTiktokTrends(product: Product): Promise<number> {
    if (!(await this.rateLimiter.canMakeRequest('tiktok'))) {
      this.logger.warn('TikTok rate limit exceeded');
      return this.FALLBACK_SCORE;
    }

    try {
      const data = await this.tiktokProvider.getTiktokScore(product.title);
      await this.rateLimiter.recordRequest('tiktok');
      return data.viralityScore;
    } catch (error) {
      await this.rateLimiter.updateSourceStatus('tiktok', 'error', error.message);
      throw error;
    }
  }

  /**
   * Normalize cached data to AggregatedScore format
   */
  private normalizeCachedData(cached: any): AggregatedScore {
    const aggregated =
      cached.scores.googleTrendScore * 0.3 +
      cached.scores.twitterScore * 0.25 +
      cached.scores.redditScore * 0.25 +
      cached.scores.tiktokScore * 0.2;

    return {
      googleTrendScore: cached.scores.googleTrendScore,
      twitterScore: cached.scores.twitterScore,
      redditScore: cached.scores.redditScore,
      tiktokScore: cached.scores.tiktokScore,
      aggregatedScore: aggregated,
      source: cached.source,
      failedSources: cached.failedSources,
    };
  }
}
