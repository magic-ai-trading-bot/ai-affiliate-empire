import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

interface PromptVersion {
  id: string;
  version: number;
  template: string;
  parameters: any;
  performance: {
    uses: number;
    avgCTR: number;
    avgConversions: number;
    avgRevenue: number;
  };
  createdAt: string;
}

@Injectable()
export class PromptVersioningService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Optimize prompts based on performance
   */
  async optimizePrompts() {
    console.log('🎯 Optimizing prompt versions...');

    const versions = await this.getPromptVersions();

    if (versions.length === 0) {
      // Create initial versions
      return this.createInitialVersions();
    }

    // Find best performing version
    const best = versions.reduce((prev: PromptVersion, current: PromptVersion) =>
      current.performance.avgRevenue > prev.performance.avgRevenue ? current : prev,
    );

    // Generate new variant based on best performer
    const newVersion = await this.generateVariant(best);

    console.log(`✅ Created new prompt version ${newVersion.version}`);

    return {
      bestVersion: best.version,
      newVersion: newVersion.version,
      improvement: this.calculateImprovement(versions),
    };
  }

  /**
   * Get all prompt versions
   */
  async getPromptVersions(): Promise<PromptVersion[]> {
    const config = await this.getOrCreateConfig();
    return ((config.config as any).promptVersions || []) as PromptVersion[];
  }

  /**
   * Get performance metrics for all versions
   */
  async getPerformance() {
    const versions = await this.getPromptVersions();

    const sorted = versions.sort(
      (a: PromptVersion, b: PromptVersion) => b.performance.avgRevenue - a.performance.avgRevenue,
    );

    return {
      total: versions.length,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      versions: sorted.map((v: PromptVersion) => ({
        version: v.version,
        uses: v.performance.uses,
        avgCTR: v.performance.avgCTR,
        avgConversions: v.performance.avgConversions,
        avgRevenue: v.performance.avgRevenue,
        createdAt: v.createdAt,
      })),
    };
  }

  /**
   * Track prompt usage and performance
   */
  async trackUsage(versionId: string, metrics: {
    ctr: number;
    conversions: number;
    revenue: number;
  }) {
    const versions = await this.getPromptVersions();
    const version = versions.find((v: PromptVersion) => v.id === versionId);

    if (!version) return;

    // Update performance metrics
    const perf = version.performance;
    perf.uses++;
    perf.avgCTR = (perf.avgCTR * (perf.uses - 1) + metrics.ctr) / perf.uses;
    perf.avgConversions = (perf.avgConversions * (perf.uses - 1) + metrics.conversions) / perf.uses;
    perf.avgRevenue = (perf.avgRevenue * (perf.uses - 1) + metrics.revenue) / perf.uses;

    // Save updated versions
    await this.saveVersions(versions);
  }

  /**
   * Create initial prompt versions
   */
  private async createInitialVersions() {
    const versions: PromptVersion[] = [
      {
        id: 'v1',
        version: 1,
        template: 'enthusiastic',
        parameters: { tone: 'enthusiastic', ctaPosition: 'end' },
        performance: { uses: 0, avgCTR: 0, avgConversions: 0, avgRevenue: 0 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'v2',
        version: 2,
        template: 'educational',
        parameters: { tone: 'educational', ctaPosition: 'beginning' },
        performance: { uses: 0, avgCTR: 0, avgConversions: 0, avgRevenue: 0 },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'v3',
        version: 3,
        template: 'storytelling',
        parameters: { tone: 'storytelling', ctaPosition: 'middle' },
        performance: { uses: 0, avgCTR: 0, avgConversions: 0, avgRevenue: 0 },
        createdAt: new Date().toISOString(),
      },
    ];

    await this.saveVersions(versions);

    return {
      created: versions.length,
      versions,
    };
  }

  /**
   * Generate new variant based on best performer
   */
  private async generateVariant(best: PromptVersion): Promise<PromptVersion> {
    const versions = await this.getPromptVersions();
    const nextVersion = Math.max(...versions.map((v: PromptVersion) => v.version)) + 1;

    // Create variant with slight modifications
    const newVersion: PromptVersion = {
      id: `v${nextVersion}`,
      version: nextVersion,
      template: `${best.template}_optimized`,
      parameters: {
        ...best.parameters,
        optimized: true,
        basedOn: best.version,
      },
      performance: { uses: 0, avgCTR: 0, avgConversions: 0, avgRevenue: 0 },
      createdAt: new Date().toISOString(),
    };

    versions.push(newVersion);
    await this.saveVersions(versions);

    return newVersion;
  }

  /**
   * Calculate improvement over time
   */
  private calculateImprovement(versions: PromptVersion[]): number {
    if (versions.length < 2) return 0;

    const sorted = versions.sort(
      (a: PromptVersion, b: PromptVersion) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const first = sorted[0].performance.avgRevenue || 1;
    const last = sorted[sorted.length - 1].performance.avgRevenue || 0;

    return ((last - first) / first) * 100;
  }

  private async saveVersions(versions: PromptVersion[]) {
    const config = await this.getOrCreateConfig();

    await this.prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        config: {
          ...(config.config as object),
          promptVersions: versions,
        },
      },
    });
  }

  private async getOrCreateConfig() {
    let config = await this.prisma.systemConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!config) {
      config = await this.prisma.systemConfig.create({
        data: { config: {} },
      });
    }

    return config;
  }
}
