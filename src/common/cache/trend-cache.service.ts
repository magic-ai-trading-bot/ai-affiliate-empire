import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CachedTrendData {
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
  private readonly logger = new Logger(TrendCacheService.name);
  private readonly TTL_HOURS = parseInt(process.env.TREND_CACHE_TTL_HOURS || '12');
  private readonly TTL_MS = this.TTL_HOURS * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get cached trend data for a product
   */
  async get(productId: string): Promise<CachedTrendData | null> {
    try {
      const dbCache = await this.prisma.trendCache.findUnique({
        where: { productId },
      });

      if (dbCache && this.isValid(dbCache.nextUpdateAt)) {
        return {
          scores: {
            googleTrendScore: dbCache.googleTrendScore,
            twitterScore: dbCache.twitterScore,
            redditScore: dbCache.redditScore,
            tiktokScore: dbCache.tiktokScore,
          },
          source: dbCache.source,
          failedSources: dbCache.failedSources,
          timestamp: dbCache.lastUpdated,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get cache for product ${productId}`, error);
      return null;
    }
  }

  /**
   * Set cache for a product
   */
  async set(productId: string, data: CachedTrendData): Promise<void> {
    const nextUpdateAt = new Date(Date.now() + this.TTL_MS);

    try {
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

      this.logger.debug(`Cache set for product ${productId}`);
    } catch (error) {
      this.logger.error(`Failed to set cache for product ${productId}`, error);
      throw error;
    }
  }

  /**
   * Delete cache for a product
   */
  async delete(productId: string): Promise<void> {
    try {
      await this.prisma.trendCache.delete({
        where: { productId },
      });
      this.logger.debug(`Cache deleted for product ${productId}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache for product ${productId}`, error);
    }
  }

  /**
   * Check if cache is still valid
   */
  isValid(nextUpdateAt: Date): boolean {
    return nextUpdateAt > new Date();
  }

  /**
   * Get all products that need cache refresh
   */
  async getNeedingRefresh(): Promise<string[]> {
    try {
      const stale = await this.prisma.trendCache.findMany({
        where: {
          nextUpdateAt: { lt: new Date() },
        },
        select: { productId: true },
      });

      return stale.map((s) => s.productId);
    } catch (error) {
      this.logger.error('Failed to get stale cache entries', error);
      return [];
    }
  }

  /**
   * Record cache error
   */
  async recordError(productId: string, error: string): Promise<void> {
    try {
      await this.prisma.trendCache.update({
        where: { productId },
        data: {
          errorCount: {
            increment: 1,
          },
          lastError: error,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record error for product ${productId}`, err);
    }
  }
}
