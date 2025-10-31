import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

export interface ProductRecommendation {
  productId: string;
  productTitle: string;
  action: 'kill' | 'scale' | 'maintain' | 'optimize';
  reason: string;
  priority: number;
  metrics: {
    roi: number;
    revenue: number;
    conversions: number;
    trend: string;
  };
}

@Injectable()
export class StrategyOptimizerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kill products with ROI below threshold
   */
  async killLowPerformers(threshold: number): Promise<{
    killed: number;
    products: string[];
  }> {
    console.log(`🔪 Killing products with ROI < ${threshold}...`);

    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        videos: true,
      },
    });

    const toKill: string[] = [];

    for (const product of products) {
      const roi = this.calculateROI(product);
      const videoCount = product.videos?.length || 0;

      // Kill if ROI is below threshold and has enough data
      // Don't kill products with no videos (insufficient data for ROI calculation)
      if (roi < threshold && product.analytics.length >= 7 && videoCount > 0) {
        await this.prisma.product.update({
          where: { id: product.id },
          data: { status: 'ARCHIVED' },
        });
        toKill.push(product.title);
      }
    }

    console.log(`✅ Killed ${toKill.length} low performers`);

    return {
      killed: toKill.length,
      products: toKill,
    };
  }

  /**
   * Analyze product and generate recommendation
   */
  async analyzeProduct(product: any): Promise<ProductRecommendation | null> {
    const analytics = product.analytics || [];

    if (analytics.length < 3) {
      return null; // Not enough data
    }

    const roi = this.calculateROI(product);
    const totalRevenue = analytics.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    );
    const totalConversions = analytics.reduce(
      (sum: number, a: any): number => sum + a.conversions,
      0,
    );
    const trend = this.calculateTrend(analytics);

    // Decision logic
    let action: 'kill' | 'scale' | 'maintain' | 'optimize';
    let reason: string;
    let priority: number;

    if (roi < 0.5 && analytics.length >= 7) {
      action = 'kill';
      reason = `ROI ${roi.toFixed(2)} below threshold 0.5 for ${analytics.length} days`;
      priority = 10;
    } else if (roi > 2.0 && trend === 'up') {
      action = 'scale';
      reason = `High ROI ${roi.toFixed(2)} with upward trend`;
      priority = 9;
    } else if (roi < 1.0 && trend === 'down') {
      action = 'optimize';
      reason = `Low ROI ${roi.toFixed(2)} with downward trend`;
      priority = 7;
    } else {
      action = 'maintain';
      reason = `Stable performance, ROI ${roi.toFixed(2)}`;
      priority = 3;
    }

    return {
      productId: product.id,
      productTitle: product.title,
      action,
      reason,
      priority,
      metrics: {
        roi,
        revenue: totalRevenue,
        conversions: totalConversions,
        trend,
      },
    };
  }

  /**
   * Calculate product ROI
   */
  private calculateROI(product: any): number {
    const totalRevenue = product.analytics?.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    ) || 0;

    const videoCount = product.videos?.length || 0;
    const cost = videoCount * 0.27; // $0.27 per video

    if (cost === 0) return 0;

    return (totalRevenue - cost) / cost;
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(analytics: any[]): string {
    if (analytics.length < 2) return 'neutral';

    const sorted = analytics.sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const recent = sorted.slice(0, Math.floor(sorted.length / 2));
    const previous = sorted.slice(Math.floor(sorted.length / 2));

    const recentRevenue = recent.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    );
    const previousRevenue = previous.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    );

    if (previousRevenue === 0) return recentRevenue > 0 ? 'up' : 'neutral';

    const change = ((recentRevenue - previousRevenue) / previousRevenue) * 100;

    return change > 10 ? 'up' : change < -10 ? 'down' : 'neutral';
  }
}
