import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { ROICalculatorService } from './services/roi-calculator.service';
import { PerformanceAnalyzerService } from './services/performance-analyzer.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsCollector: MetricsCollectorService,
    private readonly roiCalculator: ROICalculatorService,
    private readonly performanceAnalyzer: PerformanceAnalyzerService,
  ) {}

  /**
   * Get dashboard overview with key metrics
   */
  async getDashboardOverview() {
    const [
      totalRevenue,
      totalProducts,
      totalVideos,
      totalPublications,
      recentAnalytics,
      topProducts,
    ] = await Promise.all([
      this.getTotalRevenue(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.video.count({ where: { status: 'READY' } }),
      this.prisma.publication.count({ where: { status: 'PUBLISHED' } }),
      this.getRecentAnalytics(7),
      this.getTopProducts(5),
    ]);

    return {
      revenue: {
        total: totalRevenue,
        lastWeek: recentAnalytics.reduce((sum: number, a: any): number => sum + parseFloat(a.revenue.toString()), 0),
        growth: this.calculateGrowth(recentAnalytics),
      },
      products: {
        active: totalProducts,
        topPerformers: topProducts,
      },
      content: {
        videosReady: totalVideos,
        published: totalPublications,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get revenue analytics for specified period
   */
  async getRevenueAnalytics(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.prisma.productAnalytics.findMany({
      where: {
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const revenueByDate = analytics.reduce((acc: Record<string, any>, a: any) => {
      const dateStr = a.date.toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, revenue: 0, clicks: 0, conversions: 0 };
      }
      acc[dateStr].revenue += parseFloat(a.revenue.toString());
      acc[dateStr].clicks += a.clicks;
      acc[dateStr].conversions += a.conversions;
      return acc;
    }, {} as Record<string, any>);

    return {
      period: { days, startDate, endDate: new Date() },
      data: Object.values(revenueByDate),
      totals: {
        revenue: Object.values(revenueByDate).reduce((sum: number, d: any) => sum + d.revenue, 0),
        clicks: Object.values(revenueByDate).reduce((sum: number, d: any) => sum + d.clicks, 0),
        conversions: Object.values(revenueByDate).reduce((sum: number, d: any) => sum + d.conversions, 0),
      },
    };
  }

  /**
   * Get top performing products
   */
  async getTopProducts(limit: number) {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
      orderBy: { overallScore: 'desc' },
      take: limit,
    });

    return products.map((p: any) => ({
      id: p.id,
      title: p.title,
      score: p.overallScore,
      revenue: p.analytics.reduce((sum: number, a: any): number => sum + parseFloat(a.revenue.toString()), 0),
      clicks: p.analytics.reduce((sum: number, a: any): number => sum + a.clicks, 0),
      conversions: p.analytics.reduce((sum: number, a: any): number => sum + a.conversions, 0),
      roi: this.roiCalculator.calculateProductROI(p),
    }));
  }

  /**
   * Get product performance details
   */
  async getProductPerformance(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        network: true,
        videos: {
          include: {
            publications: {
              include: {
                analytics: true,
              },
            },
          },
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return this.performanceAnalyzer.analyzeProduct(product);
  }

  /**
   * Compare platform performance
   */
  async getPlatformComparison() {
    const platforms = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'];
    const comparison = [];

    for (const platform of platforms) {
      const publications = await this.prisma.publication.findMany({
        where: { platform, status: 'PUBLISHED' },
        include: {
          analytics: true,
        },
      });

      const totalViews = publications.reduce(
        (sum: number, p: any): number => sum + p.analytics.reduce((s: number, a: any): number => s + a.views, 0),
        0,
      );

      const totalEngagement = publications.reduce(
        (sum: number, p: any): number => sum + p.analytics.reduce((s: number, a: any): number => s + a.likes + a.comments + a.shares, 0),
        0,
      );

      comparison.push({
        platform,
        publications: publications.length,
        views: totalViews,
        engagement: totalEngagement,
        avgEngagementRate: totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0,
      });
    }

    return {
      platforms: comparison,
      winner: comparison.sort((a, b) => b.views - a.views)[0],
    };
  }

  /**
   * Collect analytics from all platforms
   */
  async collectAllAnalytics() {
    console.log('📊 Collecting analytics from all platforms...');

    const result = await this.metricsCollector.collectAll();

    console.log(`✅ Analytics collected: ${result.collected} records`);

    return result;
  }

  /**
   * Get ROI analysis
   */
  async getROIAnalysis() {
    return this.roiCalculator.calculateSystemROI();
  }

  private async getTotalRevenue(): Promise<number> {
    const result = await this.prisma.productAnalytics.aggregate({
      _sum: { revenue: true },
    });

    return parseFloat(result._sum.revenue?.toString() || '0');
  }

  private async getRecentAnalytics(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.productAnalytics.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: 'desc' },
    });
  }

  private calculateGrowth(analytics: any[]): number {
    if (analytics.length < 2) return 0;

    const recent = analytics.slice(0, Math.floor(analytics.length / 2));
    const previous = analytics.slice(Math.floor(analytics.length / 2));

    const recentSum = recent.reduce((sum: number, a: any): number => sum + parseFloat(a.revenue.toString()), 0);
    const previousSum = previous.reduce((sum: number, a: any): number => sum + parseFloat(a.revenue.toString()), 0);

    if (previousSum === 0) return 100;

    return ((recentSum - previousSum) / previousSum) * 100;
  }
}
