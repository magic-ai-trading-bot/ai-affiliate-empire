import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

@Injectable()
export class MetricsCollectorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collect analytics from all platforms
   */
  async collectAll(): Promise<{ collected: number; platforms: string[] }> {
    const platforms = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'];
    let collected = 0;

    for (const platform of platforms) {
      try {
        const count = await this.collectPlatformMetrics(platform);
        collected += count;
      } catch (error) {
        console.error(`Error collecting metrics for ${platform}:`, error);
      }
    }

    return { collected, platforms };
  }

  /**
   * Collect metrics for specific platform
   */
  private async collectPlatformMetrics(platform: string): Promise<number> {
    console.log(`📊 Collecting metrics for ${platform}...`);

    const publications = await this.prisma.publication.findMany({
      where: {
        platform,
        status: 'PUBLISHED',
        publishedAt: { not: null },
      },
      include: {
        video: {
          include: {
            product: true,
          },
        },
      },
    });

    let collected = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const pub of publications) {
      try {
        // Mock metrics (in production, call actual platform APIs)
        const metrics = this.generateMockMetrics(platform);

        // Create or update platform analytics
        await this.prisma.platformAnalytics.upsert({
          where: {
            publicationId_date: {
              publicationId: pub.id,
              date: today,
            },
          },
          create: {
            publicationId: pub.id,
            date: today,
            ...metrics,
          },
          update: metrics,
        });

        // Update product analytics
        await this.updateProductAnalytics(pub.video.productId, metrics, today);

        collected++;
      } catch (error) {
        console.error(`Error collecting metrics for publication ${pub.id}:`, error);
      }
    }

    console.log(`✅ Collected ${collected} metrics for ${platform}`);

    return collected;
  }

  /**
   * Update product analytics with platform metrics
   */
  private async updateProductAnalytics(
    productId: string,
    metrics: any,
    date: Date,
  ): Promise<void> {
    const existing = await this.prisma.productAnalytics.findUnique({
      where: {
        productId_date: {
          productId,
          date,
        },
      },
    });

    if (existing) {
      // Aggregate metrics
      await this.prisma.productAnalytics.update({
        where: { id: existing.id },
        data: {
          views: existing.views + metrics.views,
          clicks: existing.clicks + metrics.clicks,
          conversions: existing.conversions + (metrics.clicks > 100 ? 1 : 0),
          revenue: parseFloat(existing.revenue.toString()) + (metrics.clicks > 100 ? 5.0 : 0),
        },
      });
    } else {
      // Create new record
      await this.prisma.productAnalytics.create({
        data: {
          productId,
          date,
          views: metrics.views,
          clicks: metrics.clicks,
          conversions: metrics.clicks > 100 ? 1 : 0,
          revenue: metrics.clicks > 100 ? 5.0 : 0,
          ctr: metrics.clicks / metrics.views,
          conversionRate: metrics.clicks > 100 ? 1 / metrics.clicks : 0,
          roi: 0, // Will be calculated later
        },
      });
    }
  }

  /**
   * Generate mock metrics for development
   * In production, replace with actual API calls
   */
  private generateMockMetrics(platform: string) {
    const baseViews = platform === 'YOUTUBE' ? 5000 : platform === 'TIKTOK' ? 10000 : 3000;

    const views = Math.floor(baseViews + Math.random() * baseViews);
    const likes = Math.floor(views * (0.05 + Math.random() * 0.1));
    const comments = Math.floor(likes * 0.1);
    const shares = Math.floor(likes * 0.2);
    const clicks = Math.floor(views * (0.01 + Math.random() * 0.02));

    return {
      views,
      likes,
      comments,
      shares,
      clicks,
      watchTime: Math.floor(views * (30 + Math.random() * 20)),
      engagement: ((likes + comments + shares) / views) * 100,
    };
  }
}
