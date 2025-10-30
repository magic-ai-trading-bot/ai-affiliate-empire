import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

@Injectable()
export class ROICalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  // Cost constants (monthly)
  private readonly COSTS = {
    FIXED: {
      PIKALABS: 28,
      ELEVENLABS: 28,
      HOSTING: 30,
      TOTAL: 86,
    },
    VARIABLE: {
      OPENAI_PER_SCRIPT: 0.02,
      CLAUDE_PER_BLOG: 0.05,
      DALLE_PER_THUMBNAIL: 0.04,
      PIKALABS_PER_VIDEO: 0.014, // $28/2000 videos
      ELEVENLABS_PER_VOICE: 0.01,
    },
  };

  /**
   * Calculate ROI for a specific product
   */
  calculateProductROI(product: any): number {
    const totalRevenue = product.analytics?.reduce(
      (sum: number, a: any): number => sum + parseFloat(a.revenue.toString()),
      0,
    ) || 0;

    const videoCount = product.videos?.length || 0;
    const cost = this.calculateContentCost(videoCount);

    if (cost === 0) return 0;

    return ((totalRevenue - cost) / cost) * 100;
  }

  /**
   * Calculate system-wide ROI
   */
  async calculateSystemROI() {
    const [totalRevenue, videoCount, blogCount] = await Promise.all([
      this.getTotalRevenue(),
      this.prisma.video.count({ where: { status: 'READY' } }),
      this.prisma.blog.count({ where: { status: 'PUBLISHED' } }),
    ]);

    const totalCost = this.calculateSystemCost(videoCount, blogCount);
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    return {
      revenue: {
        total: totalRevenue,
        breakdown: await this.getRevenueBreakdown(),
      },
      costs: {
        total: totalCost,
        fixed: this.COSTS.FIXED.TOTAL,
        variable: totalCost - this.COSTS.FIXED.TOTAL,
        breakdown: this.getCostBreakdown(videoCount, blogCount),
      },
      roi: {
        percentage: roi,
        profit: totalRevenue - totalCost,
        breakEven: totalCost,
      },
      content: {
        videos: videoCount,
        blogs: blogCount,
        avgCostPerVideo: this.calculateContentCost(1),
        avgRevenuePerVideo: videoCount > 0 ? totalRevenue / videoCount : 0,
      },
    };
  }

  /**
   * Calculate cost for content production
   */
  private calculateContentCost(videoCount: number, blogCount: number = 0): number {
    const videoCost =
      videoCount *
      (this.COSTS.VARIABLE.OPENAI_PER_SCRIPT +
        this.COSTS.VARIABLE.PIKALABS_PER_VIDEO +
        this.COSTS.VARIABLE.ELEVENLABS_PER_VOICE +
        this.COSTS.VARIABLE.DALLE_PER_THUMBNAIL);

    const blogCost = blogCount * this.COSTS.VARIABLE.CLAUDE_PER_BLOG;

    return videoCost + blogCost;
  }

  /**
   * Calculate total system cost
   */
  private calculateSystemCost(videoCount: number, blogCount: number): number {
    const variableCost = this.calculateContentCost(videoCount, blogCount);
    return this.COSTS.FIXED.TOTAL + variableCost;
  }

  /**
   * Get cost breakdown
   */
  private getCostBreakdown(videoCount: number, blogCount: number) {
    return {
      fixed: {
        hosting: this.COSTS.FIXED.HOSTING,
        pikaLabs: this.COSTS.FIXED.PIKALABS,
        elevenLabs: this.COSTS.FIXED.ELEVENLABS,
      },
      variable: {
        scripts: videoCount * this.COSTS.VARIABLE.OPENAI_PER_SCRIPT,
        videos: videoCount * this.COSTS.VARIABLE.PIKALABS_PER_VIDEO,
        voices: videoCount * this.COSTS.VARIABLE.ELEVENLABS_PER_VOICE,
        thumbnails: videoCount * this.COSTS.VARIABLE.DALLE_PER_THUMBNAIL,
        blogs: blogCount * this.COSTS.VARIABLE.CLAUDE_PER_BLOG,
      },
    };
  }

  /**
   * Get revenue breakdown by network
   */
  private async getRevenueBreakdown() {
    const networks = await this.prisma.affiliateNetwork.findMany({
      include: {
        analytics: true,
      },
    });

    return networks.map((network: any) => ({
      network: network.name,
      revenue: network.analytics.reduce(
        (sum: number, a: any): number => sum + parseFloat(a.totalRevenue.toString()),
        0,
      ),
    }));
  }

  /**
   * Get total revenue
   */
  private async getTotalRevenue(): Promise<number> {
    const result = await this.prisma.productAnalytics.aggregate({
      _sum: { revenue: true },
    });

    return parseFloat(result._sum.revenue?.toString() || '0');
  }
}
