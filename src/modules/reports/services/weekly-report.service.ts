import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

interface WeeklyReport {
  period: {
    start: string;
    end: string;
    week: number;
  };
  revenue: {
    total: number;
    byPlatform: Array<{ platform: string; revenue: number }>;
    byProduct: Array<{ productTitle: string; revenue: number }>;
    growth: number;
  };
  content: {
    videosCreated: number;
    videosPublished: number;
    blogsPublished: number;
    avgCTR: number;
    avgConversionRate: number;
  };
  performance: {
    topProducts: Array<{ title: string; roi: number; revenue: number }>;
    topPlatforms: Array<{ platform: string; views: number; revenue: number }>;
    worstPerformers: Array<{ title: string; roi: number }>;
  };
  optimization: {
    productsKilled: number;
    productsScaled: number;
    abTestsRun: number;
    promptVersions: number;
  };
  costs: {
    total: number;
    fixed: number;
    variable: number;
    costPerVideo: number;
  };
  roi: {
    overall: number;
    profit: number;
    breakeven: boolean;
  };
  recommendations: string[];
}

@Injectable()
export class WeeklyReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateWeeklyReport(): Promise<WeeklyReport> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const weekNumber = this.getWeekNumber(endDate);

    // Get analytics for the week
    const analytics = await this.prisma.productAnalytics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: {
          include: {
            network: true,
          },
        },
      },
    });

    // Get videos and publications
    const videos = await this.prisma.video.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: true,
        publications: {
          include: {
            analytics: true,
          },
        },
      },
    });

    const blogs = await this.prisma.blog.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'PUBLISHED',
      },
    });

    // Calculate totals
    const totalRevenue = analytics.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    );

    const totalClicks = analytics.reduce((sum: number, a: any): number => sum + a.clicks, 0);
    const totalViews = videos.reduce(
      (sum: number, v: any): number =>
        sum +
        v.publications.reduce(
          (s: number, p: any): number =>
            s + p.analytics.reduce((ss: number, a: any): number => ss + a.views, 0),
          0,
        ),
      0,
    );
    const totalConversions = analytics.reduce(
      (sum: number, a: any): number => sum + a.conversions,
      0,
    );

    // Calculate costs
    const fixedCost = 86; // $86/month
    const variableCost = videos.length * 0.27;
    const totalCost = fixedCost + variableCost;

    // Calculate ROI
    const profit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? ((profit / totalCost) * 100) : 0;

    // Revenue by platform
    const platformRevenue: Record<string, number> = {};
    for (const video of videos) {
      for (const pub of video.publications) {
        if (!platformRevenue[pub.platform]) {
          platformRevenue[pub.platform] = 0;
        }
        const pubAnalytics = await this.prisma.productAnalytics.findMany({
          where: {
            productId: video.productId,
            date: {
              gte: pub.publishedAt || startDate,
              lte: endDate,
            },
          },
        });
        platformRevenue[pub.platform] += pubAnalytics.reduce(
          (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
          0,
        );
      }
    }

    // Revenue by product
    const productRevenue: Record<string, { title: string; revenue: number; roi: number }> = {};
    for (const a of analytics) {
      const productId = a.productId;
      if (!productRevenue[productId]) {
        productRevenue[productId] = {
          title: a.product.title,
          revenue: 0,
          roi: 0,
        };
      }
      productRevenue[productId].revenue += parseFloat(a.revenue.toString());
    }

    // Calculate ROI per product
    for (const productId in productRevenue) {
      const productVideos = videos.filter((v: any) => v.productId === productId).length;
      const productCost = productVideos * 0.27;
      const productRoi = productCost > 0 ? ((productRevenue[productId].revenue - productCost) / productCost) * 100 : 0;
      productRevenue[productId].roi = productRoi;
    }

    // Sort top/worst performers
    const sortedProducts = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue);
    const topProducts = sortedProducts.slice(0, 5);
    const worstPerformers = sortedProducts.filter((p) => p.roi < 0.5).slice(0, 5);

    // Platform performance
    const platformPerformance = Object.entries(platformRevenue).map(([platform, revenue]) => ({
      platform,
      revenue,
      views: videos
        .flatMap((v: any) => v.publications.filter((p: any) => p.platform === platform))
        .reduce((sum: number, p: any): number => sum + p.analytics.reduce((s: number, a: any): number => s + a.views, 0), 0),
    })).sort((a, b) => b.revenue - a.revenue);

    // Get previous week for growth calculation
    const prevWeekStart = new Date(startDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekAnalytics = await this.prisma.productAnalytics.findMany({
      where: {
        date: {
          gte: prevWeekStart,
          lt: startDate,
        },
      },
    });
    const prevWeekRevenue = prevWeekAnalytics.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    );
    const growth = prevWeekRevenue > 0 ? ((totalRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 100;

    // Recommendations
    const recommendations = this.generateRecommendations({
      roi,
      avgCTR: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
      avgConversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      worstPerformersCount: worstPerformers.length,
      videosPublished: videos.filter((v: any) => v.status === 'READY').length,
    });

    return {
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        week: weekNumber,
      },
      revenue: {
        total: totalRevenue,
        byPlatform: platformPerformance.map((p) => ({ platform: p.platform, revenue: p.revenue })),
        byProduct: topProducts.map((p) => ({ productTitle: p.title, revenue: p.revenue })),
        growth,
      },
      content: {
        videosCreated: videos.length,
        videosPublished: videos.filter((v: any) => v.status === 'READY').length,
        blogsPublished: blogs,
        avgCTR: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
        avgConversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      },
      performance: {
        topProducts: topProducts.map((p) => ({ title: p.title, roi: p.roi, revenue: p.revenue })),
        topPlatforms: platformPerformance.slice(0, 3),
        worstPerformers: worstPerformers.map((p) => ({ title: p.title, roi: p.roi })),
      },
      optimization: {
        productsKilled: worstPerformers.length,
        productsScaled: topProducts.filter((p) => p.roi > 2.0).length,
        abTestsRun: 0, // From system config
        promptVersions: 0, // From system config
      },
      costs: {
        total: totalCost,
        fixed: fixedCost,
        variable: variableCost,
        costPerVideo: videos.length > 0 ? variableCost / videos.length : 0,
      },
      roi: {
        overall: roi,
        profit,
        breakeven: totalRevenue >= totalCost,
      },
      recommendations,
    };
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private generateRecommendations(metrics: {
    roi: number;
    avgCTR: number;
    avgConversionRate: number;
    worstPerformersCount: number;
    videosPublished: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.roi < 1.0) {
      recommendations.push('❌ ROI below 100%. Review product selection criteria and content quality.');
    } else if (metrics.roi < 2.0) {
      recommendations.push('⚠️  ROI needs improvement. Focus on higher-commission products.');
    } else {
      recommendations.push('✅ Strong ROI! Consider scaling production.');
    }

    if (metrics.avgCTR < 1.0) {
      recommendations.push('⚠️  Low CTR. Improve thumbnails and titles for better click-through.');
    }

    if (metrics.avgConversionRate < 2.0) {
      recommendations.push('⚠️  Low conversion rate. Strengthen CTAs and affiliate link placement.');
    }

    if (metrics.worstPerformersCount > 5) {
      recommendations.push(`🔪 ${metrics.worstPerformersCount} products performing poorly. Archive immediately.`);
    }

    if (metrics.videosPublished < 50) {
      recommendations.push('📈 Increase production to 50+ videos/week for optimal results.');
    }

    return recommendations;
  }
}
