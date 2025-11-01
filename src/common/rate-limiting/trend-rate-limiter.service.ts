import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TrendRateLimiterService {
  private readonly logger = new Logger(TrendRateLimiterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a request can be made to a specific source
   */
  async canMakeRequest(sourceName: string): Promise<boolean> {
    try {
      const source = await this.prisma.trendDataSource.findUnique({
        where: { name: sourceName },
      });

      if (!source || !source.enabled) {
        this.logger.warn(`Source ${sourceName} is not enabled`);
        return false;
      }

      // Check if source is in error state
      if (source.status === 'error') {
        this.logger.warn(`Source ${sourceName} is in error state`);
        return false;
      }

      // Check daily limit
      if (source.dailyUsed >= source.dailyLimit) {
        this.logger.warn(`Source ${sourceName} has reached daily limit (${source.dailyLimit})`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to check rate limit for source ${sourceName}`, error);
      return false;
    }
  }

  /**
   * Record a request to a specific source
   */
  async recordRequest(sourceName: string): Promise<void> {
    try {
      await this.prisma.trendDataSource.update({
        where: { name: sourceName },
        data: {
          dailyUsed: {
            increment: 1,
          },
          lastSyncAt: new Date(),
        },
      });

      this.logger.debug(`Recorded request for source ${sourceName}`);
    } catch (error) {
      this.logger.error(`Failed to record request for source ${sourceName}`, error);
    }
  }

  /**
   * Reset daily usage counters (should be run via cron job)
   */
  async resetDaily(): Promise<void> {
    try {
      const result = await this.prisma.trendDataSource.updateMany({
        data: {
          dailyUsed: 0,
        },
      });

      this.logger.log(`Reset daily usage counters for ${result.count} sources`);
    } catch (error) {
      this.logger.error('Failed to reset daily usage counters', error);
    }
  }

  /**
   * Update source status
   */
  async updateSourceStatus(
    sourceName: string,
    status: 'active' | 'paused' | 'error',
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prisma.trendDataSource.update({
        where: { name: sourceName },
        data: {
          status,
          errorMessage,
          lastSyncAt: new Date(),
        },
      });

      this.logger.log(`Updated ${sourceName} status to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update status for source ${sourceName}`, error);
    }
  }

  /**
   * Initialize trend data sources if they don't exist
   */
  async initializeSources(): Promise<void> {
    const sources = [
      {
        name: 'google',
        enabled: true,
        dailyLimit: 90000, // ~60 req/min
        requestsPerMin: 60,
        cacheTTLHours: 12,
      },
      {
        name: 'twitter',
        enabled: false, // Disabled by default (requires API key)
        dailyLimit: 10000,
        requestsPerMin: 300,
        cacheTTLHours: 12,
      },
      {
        name: 'reddit',
        enabled: true,
        dailyLimit: 50000,
        requestsPerMin: 60,
        cacheTTLHours: 12,
      },
      {
        name: 'tiktok',
        enabled: false, // Disabled by default (paid service)
        dailyLimit: 100,
        requestsPerMin: 10,
        cacheTTLHours: 24,
      },
    ];

    for (const source of sources) {
      try {
        await this.prisma.trendDataSource.upsert({
          where: { name: source.name },
          create: source,
          update: {}, // Don't overwrite existing config
        });
      } catch (error) {
        this.logger.error(`Failed to initialize source ${source.name}`, error);
      }
    }

    this.logger.log('Trend data sources initialized');
  }
}
