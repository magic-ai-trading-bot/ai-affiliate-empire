import { Injectable } from '@nestjs/common';

@Injectable()
export class PerformanceAnalyzerService {
  /**
   * Analyze product performance
   */
  analyzeProduct(product: any) {
    const analytics = product.analytics || [];
    const videos = product.videos || [];

    // Calculate totals
    const totalViews = analytics.reduce((sum: number, a: any): number => sum + a.views, 0);
    const totalClicks = analytics.reduce((sum: number, a: any): number => sum + a.clicks, 0);
    const totalConversions = analytics.reduce((sum: number, a: any): number => sum + a.conversions, 0);
    const totalRevenue = analytics.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    );

    // Calculate rates
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Performance trend
    const trend = this.calculateTrend(analytics);

    // Best performing video
    const bestVideo = this.findBestVideo(videos);

    // Platform breakdown
    const platformBreakdown = this.analyzePlatformPerformance(videos);

    return {
      product: {
        id: product.id,
        title: product.title,
        price: parseFloat(product.price.toString()),
        commission: parseFloat(product.commission.toString()),
        overallScore: product.overallScore,
      },
      performance: {
        views: totalViews,
        clicks: totalClicks,
        conversions: totalConversions,
        revenue: totalRevenue,
        ctr,
        conversionRate,
      },
      trend: {
        direction: trend.direction,
        percentage: trend.percentage,
        lastUpdated: trend.lastDate,
      },
      content: {
        totalVideos: videos.length,
        bestPerformer: bestVideo,
      },
      platforms: platformBreakdown,
      recommendations: this.generateRecommendations(
        { ctr, conversionRate, totalRevenue },
        product,
      ),
    };
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(analytics: any[]) {
    if (analytics.length < 2) {
      return { direction: 'neutral', percentage: 0, lastDate: null };
    }

    const sorted = analytics.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const recent = sorted.slice(0, 7);
    const previous = sorted.slice(7, 14);

    const recentRevenue = recent.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    );
    const previousRevenue = previous.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    );

    if (previousRevenue === 0) {
      return {
        direction: recentRevenue > 0 ? 'up' : 'neutral',
        percentage: 100,
        lastDate: sorted[0]?.date,
      };
    }

    const change = ((recentRevenue - previousRevenue) / previousRevenue) * 100;

    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral',
      percentage: Math.abs(change),
      lastDate: sorted[0]?.date,
    };
  }

  /**
   * Find best performing video
   */
  private findBestVideo(videos: any[]) {
    if (videos.length === 0) return null;

    let best = videos[0];
    let maxViews = 0;

    for (const video of videos) {
      const totalViews =
        video.publications?.reduce(
          (sum: number, p: any) =>
            sum + p.analytics?.reduce((s: number, a: any) => s + a.views, 0),
          0,
        ) || 0;

      if (totalViews > maxViews) {
        maxViews = totalViews;
        best = video;
      }
    }

    return {
      id: best.id,
      title: best.title,
      views: maxViews,
    };
  }

  /**
   * Analyze platform performance
   */
  private analyzePlatformPerformance(videos: any[]) {
    const platforms: Record<string, any> = {};

    for (const video of videos) {
      for (const pub of video.publications || []) {
        if (!platforms[pub.platform]) {
          platforms[pub.platform] = {
            platform: pub.platform,
            publications: 0,
            views: 0,
            engagement: 0,
          };
        }

        platforms[pub.platform].publications++;

        for (const analytics of pub.analytics || []) {
          platforms[pub.platform].views += analytics.views;
          platforms[pub.platform].engagement +=
            analytics.likes + analytics.comments + analytics.shares;
        }
      }
    }

    return Object.values(platforms);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: any, product: any): string[] {
    const recommendations: string[] = [];

    // CTR recommendations
    if (metrics.ctr < 1.0) {
      recommendations.push(
        'Low CTR detected. Consider improving video thumbnails and titles.',
      );
    }

    // Conversion rate recommendations
    if (metrics.conversionRate < 2.0) {
      recommendations.push(
        'Low conversion rate. Review affiliate link placement and CTA effectiveness.',
      );
    }

    // Revenue recommendations
    if (metrics.totalRevenue < 10) {
      recommendations.push(
        'Low revenue. Consider focusing on higher-commission products or increasing publishing frequency.',
      );
    }

    // Product score recommendations
    if (product.overallScore < 0.5) {
      recommendations.push(
        'Low product score. Consider archiving this product and focusing on higher-scoring alternatives.',
      );
    }

    // Success case
    if (recommendations.length === 0) {
      recommendations.push(
        'Product performing well. Continue current strategy and consider scaling.',
      );
    }

    return recommendations;
  }
}
