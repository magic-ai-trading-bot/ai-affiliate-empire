import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { StrategyOptimizerService } from './services/strategy-optimizer.service';
import { ABTestingService } from './services/ab-testing.service';
import { AutoScalerService } from './services/auto-scaler.service';
import { PromptVersioningService } from './services/prompt-versioning.service';

@Injectable()
export class OptimizerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly strategyOptimizer: StrategyOptimizerService,
    private readonly abTesting: ABTestingService,
    private readonly autoScaler: AutoScalerService,
    private readonly promptVersioning: PromptVersioningService,
  ) {}

  /**
   * Run complete optimization cycle
   */
  async optimize(params: {
    minROI?: number;
    killThreshold?: number;
    scaleThreshold?: number;
  }) {
    console.log('🔧 Starting optimization cycle...');

    const minROI = params.minROI || 1.5;
    const killThreshold = params.killThreshold || 0.5;
    const scaleThreshold = params.scaleThreshold || 2.0;

    // Step 1: Kill low performers
    const killed = await this.strategyOptimizer.killLowPerformers(killThreshold);

    // Step 2: Scale high performers
    const scaled = await this.autoScaler.scaleWinners(scaleThreshold);

    // Step 3: Analyze A/B tests
    const abResults = await this.abTesting.analyzeTests();

    // Step 4: Optimize prompts
    const promptResults = await this.promptVersioning.optimizePrompts();

    // Step 5: Update system config
    await this.updateSystemConfig({
      minROI,
      killThreshold,
      scaleThreshold,
      lastOptimized: new Date(),
    });

    console.log('✅ Optimization complete');

    return {
      killed,
      scaled,
      abResults,
      promptResults,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get optimization recommendations
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
      const rec = await this.strategyOptimizer.analyzeProduct(product);
      if (rec) recommendations.push(rec);
    }

    return {
      recommendations: recommendations.sort((a: any, b: any) => b.priority - a.priority),
      totalProducts: products.length,
      actionRequired: recommendations.filter((r: any) => r.action !== 'maintain').length,
    };
  }

  /**
   * Get A/B test results
   */
  async getABTestResults() {
    return this.abTesting.getResults();
  }

  /**
   * Create new A/B test
   */
  async createABTest(params: {
    name: string;
    variantA: any;
    variantB: any;
    metric: string;
  }) {
    return this.abTesting.createTest(params);
  }

  /**
   * Get prompt performance
   */
  async getPromptPerformance() {
    return this.promptVersioning.getPerformance();
  }

  /**
   * Update system configuration
   */
  private async updateSystemConfig(config: any) {
    const existing = await this.prisma.systemConfig.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await this.prisma.systemConfig.update({
        where: { id: existing.id },
        data: {
          value: JSON.stringify({
            ...(JSON.parse(existing.value) as object),
            ...config,
          }),
        },
      });
    } else {
      await this.prisma.systemConfig.create({
        data: {
          key: 'optimizer_config',
          value: JSON.stringify(config),
        },
      });
    }
  }
}
