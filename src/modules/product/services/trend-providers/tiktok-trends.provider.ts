import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface TikTokTrendData {
  videos: number;
  views: number;
  engagement: number;
  viralityScore: number; // 0-1
  hashtags: string[];
  timestamp: Date;
}

@Injectable()
export class TiktokTrendsProvider {
  private readonly logger = new Logger(TiktokTrendsProvider.name);
  private readonly apiEnabled = process.env.TIKTOK_API_ENABLED === 'true';
  private readonly apiKey = process.env.TIKTOK_API_KEY;
  private readonly apiEndpoint = process.env.TIKTOK_API_ENDPOINT;

  /**
   * Get TikTok virality score for a product
   */
  async getTiktokScore(productName: string): Promise<TikTokTrendData> {
    // Return mock data if API is not enabled (paid service)
    if (!this.apiEnabled || !this.apiKey) {
      this.logger.debug('TikTok API disabled or not configured - using mock data');
      return this.getMockData();
    }

    try {
      // Search TikTok for product mentions
      const videos = await this.searchTiktok(productName);
      return this.analyzeVideos(videos);
    } catch (error) {
      this.logger.error('TikTok API fetch failed', {
        product: productName,
        error: error.message,
      });
      return this.getMockData();
    }
  }

  /**
   * Search TikTok via Apify API
   */
  private async searchTiktok(keyword: string): Promise<any[]> {
    if (!this.apiEndpoint || !this.apiKey) {
      throw new Error('TikTok API endpoint or key not configured');
    }

    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          searchQuery: keyword,
          resultsLimit: 100,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        },
      );

      // Handle Apify async response
      if (response.data.status === 'RUNNING') {
        return await this.pollResults(response.data.id);
      }

      return response.data.results || [];
    } catch (error) {
      this.logger.error('TikTok search failed', {
        keyword,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Poll Apify for async results
   */
  private async pollResults(runId: string): Promise<any[]> {
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(`${this.apiEndpoint}/${runId}`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        if (response.data.status === 'SUCCEEDED') {
          return response.data.output?.results || [];
        }

        if (response.data.status === 'FAILED') {
          throw new Error('Apify run failed');
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        this.logger.error('Error polling Apify results', {
          runId,
          error: error.message,
        });
        throw error;
      }
    }

    throw new Error('TikTok API timeout - max polling attempts exceeded');
  }

  /**
   * Analyze TikTok video data
   */
  private analyzeVideos(videos: any[]): TikTokTrendData {
    let totalViews = 0;
    let totalEngagement = 0;
    const hashtags = new Set<string>();

    videos.forEach((video) => {
      totalViews += video.viewCount || 0;
      totalEngagement +=
        (video.likeCount || 0) + (video.shareCount || 0) + (video.commentCount || 0);

      // Extract hashtags if available
      if (Array.isArray(video.hashtags)) {
        video.hashtags.forEach((tag: string) => hashtags.add(tag));
      }
    });

    // Normalize virality score (100k views = 1.0 score)
    const viralityScore = Math.min(totalViews / 100000, 1.0);

    this.logger.debug('TikTok trend analysis complete', {
      videos: videos.length,
      totalViews,
      totalEngagement,
      viralityScore,
      hashtags: Array.from(hashtags).slice(0, 10), // Top 10 hashtags
    });

    return {
      videos: videos.length,
      views: totalViews,
      engagement: totalEngagement,
      viralityScore,
      hashtags: Array.from(hashtags),
      timestamp: new Date(),
    };
  }

  /**
   * Return mock data when API is disabled
   */
  private getMockData(): TikTokTrendData {
    return {
      videos: 0,
      views: 0,
      engagement: 0,
      viralityScore: 0.5, // Neutral fallback
      hashtags: [],
      timestamp: new Date(),
    };
  }
}
