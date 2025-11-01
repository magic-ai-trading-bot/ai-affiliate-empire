import { Injectable, Logger } from '@nestjs/common';
import Snoowrap from 'snoowrap';

export interface RedditTrendData {
  mentions: number;
  subreddits: string[];
  engagement: number; // Total upvotes across mentions
  discussionScore: number; // 0-1
  timestamp: Date;
}

@Injectable()
export class RedditTrendsProvider {
  private readonly logger = new Logger(RedditTrendsProvider.name);
  private client: Snoowrap | null = null;

  constructor() {
    // Initialize Reddit client if credentials are provided
    if (
      process.env.REDDIT_API_ENABLED === 'true' &&
      process.env.REDDIT_CLIENT_ID &&
      process.env.REDDIT_CLIENT_SECRET &&
      process.env.REDDIT_USERNAME &&
      process.env.REDDIT_PASSWORD
    ) {
      try {
        this.client = new Snoowrap({
          userAgent: 'ai-affiliate-empire/1.0.0',
          clientId: process.env.REDDIT_CLIENT_ID,
          clientSecret: process.env.REDDIT_CLIENT_SECRET,
          username: process.env.REDDIT_USERNAME,
          password: process.env.REDDIT_PASSWORD,
        });

        // Configure rate limiting
        this.client.config({
          requestDelay: 1000, // 1 second between requests
          warnings: true,
          continueAfterRatelimitError: true,
        });

        this.logger.log('Reddit API client initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Reddit API client', error);
      }
    } else {
      this.logger.warn('Reddit API disabled or credentials not configured - using mock data');
    }
  }

  /**
   * Get Reddit discussion score for a product
   */
  async getRedditScore(productName: string): Promise<RedditTrendData> {
    if (!this.client) {
      return this.getMockData();
    }

    try {
      // Search for mentions across all subreddits
      const searchResults = await this.searchReddit(productName);

      return this.analyzeResults(searchResults);
    } catch (error) {
      this.logger.error('Reddit API fetch failed', {
        product: productName,
        error: error.message,
      });
      return this.getMockData();
    }
  }

  /**
   * Search Reddit for product mentions
   */
  private async searchReddit(productName: string): Promise<any[]> {
    if (!this.client) {
      return [];
    }

    try {
      // Search across popular product/tech subreddits
      const subreddits = [
        'all', // Search all subreddits
      ];

      const allResults: any[] = [];

      for (const subreddit of subreddits) {
        try {
          const results = await this.client.getSubreddit(subreddit).search({
            query: `"${productName}"`,
            time: 'month', // Last month
            sort: 'relevance',
            limit: 100,
          });

          allResults.push(...results);
        } catch (error) {
          this.logger.warn(`Failed to search r/${subreddit}`, {
            error: error.message,
          });
        }
      }

      return allResults;
    } catch (error) {
      this.logger.error('Reddit search failed', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Analyze Reddit search results
   */
  private analyzeResults(results: any[]): RedditTrendData {
    const subreddits = new Set<string>();
    let totalEngagement = 0;

    results.forEach((item) => {
      if (item.subreddit) {
        subreddits.add(item.subreddit.display_name);
      }
      totalEngagement += item.ups || 0;
    });

    // Normalize discussion score (1000 upvotes = 1.0 score)
    const discussionScore = Math.min(totalEngagement / 1000, 1.0);

    this.logger.debug('Reddit trend analysis complete', {
      mentions: results.length,
      subreddits: Array.from(subreddits),
      totalEngagement,
      discussionScore,
    });

    return {
      mentions: results.length,
      subreddits: Array.from(subreddits),
      engagement: totalEngagement,
      discussionScore,
      timestamp: new Date(),
    };
  }

  /**
   * Return mock data when API is disabled
   */
  private getMockData(): RedditTrendData {
    return {
      mentions: 0,
      subreddits: [],
      engagement: 0,
      discussionScore: 0.5, // Neutral fallback
      timestamp: new Date(),
    };
  }
}
