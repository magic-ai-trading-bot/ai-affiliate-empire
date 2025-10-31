import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

@Injectable()
export class AutoScalerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scale up winning products
   */
  async scaleWinners(threshold: number): Promise<{
    scaled: number;
    products: Array<{ title: string; multiplier: number }>;
  }> {
    console.log(`📈 Scaling products with ROI > ${threshold}...`);

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

    const scaled: Array<{ title: string; multiplier: number }> = [];

    for (const product of products) {
      const roi = this.calculateROI(product);

      if (roi > threshold) {
        const multiplier = this.calculateScaleMultiplier(roi);

        // Update product config to increase production
        await this.updateProductConfig(product.id, {
          videosPerWeek: Math.min(14, Math.ceil(7 * multiplier)), // Max 2 per day
          priority: 'high',
          autoScale: true,
        });

        scaled.push({
          title: product.title,
          multiplier,
        });
      }
    }

    console.log(`✅ Scaled ${scaled.length} winning products`);

    return {
      scaled: scaled.length,
      products: scaled,
    };
  }

  /**
   * Calculate scale multiplier based on ROI
   */
  private calculateScaleMultiplier(roi: number): number {
    if (roi > 5.0) return 2.0; // Double production
    if (roi > 3.0) return 1.5; // 50% increase
    if (roi > 2.0) return 1.3; // 30% increase
    return 1.0;
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
    const cost = videoCount * 0.27;

    if (cost === 0) return 0;

    return (totalRevenue - cost) / cost;
  }

  /**
   * Update product configuration
   */
  private async updateProductConfig(productId: string, config: any) {
    const systemConfig = await this.prisma.systemConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const productConfigs = (systemConfig?.config as any)?.products || {};
    productConfigs[productId] = {
      ...productConfigs[productId],
      ...config,
      updatedAt: new Date().toISOString(),
    };

    if (systemConfig) {
      await this.prisma.systemConfig.update({
        where: { id: systemConfig.id },
        data: {
          config: {
            ...(systemConfig.config as object),
            products: productConfigs,
          },
        },
      });
    } else {
      await this.prisma.systemConfig.create({
        data: {
          config: {
            products: productConfigs,
          },
        },
      });
    }
  }

  /**
   * Get scaling recommendations
   */
  async getRecommendations() {
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

    const recommendations = [];

    for (const product of products) {
      const roi = this.calculateROI(product);

      if (roi > 2.0) {
        const multiplier = this.calculateScaleMultiplier(roi);
        const currentVideos = product.videos.length;
        const recommendedVideos = Math.ceil(currentVideos * multiplier);

        recommendations.push({
          productId: product.id,
          productTitle: product.title,
          roi,
          currentVideos,
          recommendedVideos,
          multiplier,
          action: 'scale',
        });
      }
    }

    return recommendations.sort((a: any, b: any) => b.roi - a.roi);
  }
}
