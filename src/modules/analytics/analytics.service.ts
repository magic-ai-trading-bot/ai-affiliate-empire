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
    // Query 1: Get top products with minimal fields
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        overallScore: true,
        price: true,
        commission: true,
      },
      orderBy: { overallScore: 'desc' },
      take: limit,
    });

    if (products.length === 0) {
      return [];
    }

    // Query 2: Get aggregated analytics for selected products
    const productIds = products.map((p: { id: string }) => p.id);
    const analytics = await this.prisma.productAnalytics.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      },
      _sum: {
        revenue: true,
        clicks: true,
        conversions: true,
      },
    });

    // Create analytics map for fast lookup
    type StatsType = { revenue: number; clicks: number; conversions: number };
    const analyticsMap = new Map<string, StatsType>(
      analytics.map((a: any) => [
        a.productId,
        {
          revenue: parseFloat(a._sum.revenue?.toString() || '0'),
          clicks: a._sum.clicks || 0,
          conversions: a._sum.conversions || 0,
        },
      ])
    );

    // Combine results
    return products.map((p: any) => {
      const defaultStats: StatsType = { revenue: 0, clicks: 0, conversions: 0 };
      const stats: StatsType = analyticsMap.get(p.id) ?? defaultStats;
      return {
        id: p.id,
        title: p.title,
        score: p.overallScore,
        revenue: stats.revenue,
        clicks: stats.clicks,
        conversions: stats.conversions,
        roi: this.roiCalculator.calculateProductROI(p),
      };
    });
  }

  /**
   * Get product performance details
   */
  async getProductPerformance(productId: string) {
    // Query 1: Get product with network only
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        network: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Query 2: Get product analytics separately
    const analytics = await this.prisma.productAnalytics.findMany({
      where: { productId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    // Query 3: Get videos with publication count (no nested analytics)
    const videos = await this.prisma.video.findMany({
      where: { productId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        _count: {
          select: { publications: true },
        },
      },
    });

    // Query 4: Get publication analytics aggregated by video
    const videoIds = videos.map((v: any) => v.id);
    const publicationAnalytics = await this.prisma.platformAnalytics.groupBy({
      by: ['publicationId'],
      where: {
        publication: {
          videoId: { in: videoIds },
        },
      },
      _sum: {
        views: true,
        likes: true,
        comments: true,
        shares: true,
        clicks: true,
      },
    });

    // Reconstruct the data structure for the analyzer
    const productWithData = {
      ...product,
      analytics,
      videos: videos.map((v: any) => ({
        ...v,
        publications: [], // Not needed for performance analysis
      })),
      publicationAnalytics, // Pass aggregated analytics separately
    };

    return this.performanceAnalyzer.analyzeProduct(productWithData);
  }

  /**
   * Compare platform performance
   */
  async getPlatformComparison() {
    const platforms = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'];

    // Execute platform queries in parallel using Promise.all
    const comparisonPromises = platforms.map(async (platform) => {
      // Query 1: Get publication IDs and count
      const publications = await this.prisma.publication.findMany({
        where: { platform, status: 'PUBLISHED' },
        select: { id: true },
      });

      if (publications.length === 0) {
        return {
          platform,
          publications: 0,
          views: 0,
          engagement: 0,
          avgEngagementRate: 0,
        };
      }

      // Query 2: Aggregate analytics for this platform
      const publicationIds = publications.map((p: { id: string }) => p.id);
      const analytics = await this.prisma.platformAnalytics.aggregate({
        where: {
          publicationId: { in: publicationIds },
        },
        _sum: {
          views: true,
          likes: true,
          comments: true,
          shares: true,
        },
      });

      const totalViews = analytics._sum.views || 0;
      const totalEngagement =
        (analytics._sum.likes || 0) +
        (analytics._sum.comments || 0) +
        (analytics._sum.shares || 0);

      return {
        platform,
        publications: publications.length,
        views: totalViews,
        engagement: totalEngagement,
        avgEngagementRate: totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0,
      };
    });

    // Wait for all platform queries to complete
    const comparison = await Promise.all(comparisonPromises);

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
