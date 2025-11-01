import { Injectable, Logger } from '@nestjs/common';
import googleTrends from 'google-trends-api';

export interface GoogleTrendData {
  score: number; // 0-100 from Google
  normalized: number; // 0-1 normalized
  dataPoints: number; // Historical points
  timestamp: Date;
}

@Injectable()
export class GoogleTrendsProvider {
  private readonly logger = new Logger(GoogleTrendsProvider.name);
  private readonly maxRetries = parseInt(process.env.GOOGLE_TRENDS_MAX_RETRIES || '3');
  private readonly retryDelay = parseInt(process.env.GOOGLE_TRENDS_RETRY_DELAY_MS || '2000');
  private requestQueue: Promise<any> = Promise.resolve();

  /**
   * Get trend score for a keyword
   */
  async getTrendScore(keyword: string): Promise<GoogleTrendData> {
    try {
      return await this.fetchWithRetry(keyword);
    } catch (error) {
      this.logger.error('Google Trends fetch failed', {
        keyword,
        error: error.message,
      });
      // Return fallback data instead of throwing
      return {
        score: 50,
        normalized: 0.5,
        dataPoints: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Fetch trend data with retry logic
   */
  private async fetchWithRetry(keyword: string): Promise<GoogleTrendData> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Queue requests to avoid rate limiting
        return await this.requestQueue.then(() => this.fetchTrend(keyword));
      } catch (error) {
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          this.logger.warn(`Retrying Google Trends in ${delay}ms`, {
            keyword,
            attempt: attempt + 1,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Fetch trend data from Google Trends API
   */
  private async fetchTrend(keyword: string): Promise<GoogleTrendData> {
    try {
      // Get interest over time for the past 12 months
      const result = await googleTrends.interestOverTime({
        keyword: keyword,
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endTime: new Date(),
        geo: 'US', // United States
      });

      const data = JSON.parse(result);
      const timelineData = data.default?.timelineData || [];

      if (timelineData.length === 0) {
        this.logger.warn(`No trend data found for keyword: ${keyword}`);
        return {
          score: 0,
          normalized: 0,
          dataPoints: 0,
          timestamp: new Date(),
        };
      }

      // Calculate average interest value
      const values = timelineData.map((item: any) => item.value?.[0] || 0);
      const averageScore =
        values.reduce((sum: number, val: number) => sum + val, 0) / values.length;

      // Get recent trend (last 30 days average vs overall average)
      const recentValues = values.slice(-4); // Last ~30 days
      const recentAverage =
        recentValues.reduce((sum: number, val: number) => sum + val, 0) / recentValues.length;

      // Weight recent trend more heavily (70% recent, 30% historical)
      const weightedScore = recentAverage * 0.7 + averageScore * 0.3;

      this.logger.debug(`Google Trends data fetched for ${keyword}`, {
        averageScore,
        recentAverage,
        weightedScore,
        dataPoints: timelineData.length,
      });

      return {
        score: weightedScore,
        normalized: this.normalize(weightedScore),
        dataPoints: timelineData.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Google Trends API error for ${keyword}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Normalize Google Trends score (0-100) to 0-1 scale
   */
  private normalize(score: number): number {
    // Google returns 0-100, normalize to 0-1
    return Math.min(Math.max(score / 100, 0), 1.0);
  }
}
