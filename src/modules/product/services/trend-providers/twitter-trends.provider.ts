import { Injectable, Logger } from '@nestjs/common';
import { TwitterApi } from 'twitter-api-v2';

export interface TwitterTrendData {
  mentions: number;
  engagement: number; // likes + retweets + replies
  engagementRate: number; // engagement / mentions
  viralityScore: number; // 0-1
  sentiment: number; // -1 to 1 (negative to positive)
  timestamp: Date;
}

@Injectable()
export class TwitterTrendsProvider {
  private readonly logger = new Logger(TwitterTrendsProvider.name);
  private client: TwitterApi | null = null;
  private requestCount = 0;
  private readonly requestLimitPer15Min = 300;
  private lastResetAt = Date.now();

  constructor() {
    // Only initialize if API is enabled and credentials are provided
    if (process.env.TWITTER_API_ENABLED === 'true' && process.env.TWITTER_BEARER_TOKEN) {
      try {
        this.client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
        this.logger.log('Twitter API client initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Twitter API client', error);
      }
    } else {
      this.logger.warn('Twitter API disabled or credentials not configured - using mock data');
    }
  }

  /**
   * Get virality score for a product
   */
  async getViralityScore(productName: string): Promise<TwitterTrendData> {
    // Return mock data if API is not configured
    if (!this.client) {
      return this.getMockData();
    }

    try {
      // Check rate limit
      if (!this.checkRateLimit()) {
        this.logger.warn('Twitter rate limit approaching - using mock data');
        return this.getMockData();
      }

      // Search for mentions with engagement metrics
      const searchQuery = `"${productName}" lang:en -is:retweet`;

      const tweets = await this.client.v2.search(searchQuery, {
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
        max_results: 100,
      });

      return this.analyzeTweets(tweets);
    } catch (error) {
      this.logger.error('Twitter API fetch failed', {
        product: productName,
        error: error.message,
      });
      return this.getMockData();
    }
  }

  /**
   * Analyze tweet data to calculate scores
   */
  private analyzeTweets(tweets: any): TwitterTrendData {
    let totalMentions = 0;
    let totalEngagement = 0;

    // Process tweet data
    if (tweets.data && Array.isArray(tweets.data)) {
      tweets.data.forEach((tweet: any) => {
        const metrics = tweet.public_metrics;
        if (metrics) {
          totalMentions += 1;
          totalEngagement +=
            (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0);
        }
      });
    }

    const engagementRate = totalMentions > 0 ? totalEngagement / totalMentions : 0;

    // Normalize virality score (50 engagement per tweet = 1.0 score)
    const viralityScore = Math.min(engagementRate / 50, 1.0);

    this.logger.debug('Twitter trend analysis complete', {
      totalMentions,
      totalEngagement,
      engagementRate,
      viralityScore,
    });

    return {
      mentions: totalMentions,
      engagement: totalEngagement,
      engagementRate,
      viralityScore,
      sentiment: 0.5, // Neutral (TODO: Add sentiment analysis if needed)
      timestamp: new Date(),
    };
  }

  /**
   * Check and enforce rate limits
   */
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

  /**
   * Return mock data when API is disabled or rate limited
   */
  private getMockData(): TwitterTrendData {
    return {
      mentions: 0,
      engagement: 0,
      engagementRate: 0,
      viralityScore: 0.5, // Neutral fallback
      sentiment: 0,
      timestamp: new Date(),
    };
  }
}
