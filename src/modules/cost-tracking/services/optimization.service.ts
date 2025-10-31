import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { OptimizationType, Priority, OptimizationStatus, CostService } from '@prisma/client';
import { CostAggregatorService } from './cost-aggregator.service';

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: CostAggregatorService,
  ) {}

  /**
   * Analyze costs and generate optimization recommendations
   */
  async analyzeAndGenerateRecommendations(): Promise<void> {
    this.logger.log('Analyzing costs for optimization opportunities');

    const recommendations = [];

    // Analyze high-cost services
    const highCostOps = await this.analyzeHighCostOperations();
    recommendations.push(...highCostOps);

    // Check for model optimization opportunities
    const modelOpts = await this.suggestModelDowngrade();
    recommendations.push(...modelOpts);

    // Save recommendations
    for (const rec of recommendations) {
      await this.createOptimization(rec);
    }

    this.logger.log(`Generated ${recommendations.length} optimization recommendations`);
  }

  /**
   * Identify high-cost operations
   */
  private async analyzeHighCostOperations() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Group costs by service and calculate totals
    const serviceCosts = await this.aggregator.getServiceBreakdown(
      thirtyDaysAgo,
      new Date(),
    );

    const recommendations = [];

    for (const service of serviceCosts) {
      // If a service costs more than 30% of total, recommend optimization
      if (service.percentage > 30 && service.totalCost > 50) {
        recommendations.push({
          type: OptimizationType.MODEL_SELECTION,
          priority: Priority.HIGH,
          title: `High costs for ${service.serviceName}`,
          description: `${service.serviceName} accounts for ${service.percentage.toFixed(1)}% of total costs ($${service.totalCost.toFixed(2)} in last 30 days)`,
          currentCost: service.totalCost,
          estimatedSavings: service.totalCost * 0.3, // Estimate 30% savings
          savingsPercent: 30,
          recommendation: `Consider using cheaper ${service.serviceName} models or reducing usage`,
          implementation: `Review model selection and usage patterns for ${service.serviceName}`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Suggest model downgrades where applicable
   */
  private async suggestModelDowngrade() {
    const recommendations = [];

    // Check OpenAI usage
    const openaiCost = await this.getServiceCost(CostService.OPENAI, 30);
    if (openaiCost > 100) {
      recommendations.push({
        type: OptimizationType.MODEL_SELECTION,
        priority: Priority.MEDIUM,
        title: 'Consider cheaper OpenAI models',
        description: `High OpenAI costs ($${openaiCost.toFixed(2)}/month). Consider using GPT-4-Turbo or GPT-3.5-Turbo for simpler tasks.`,
        currentCost: openaiCost,
        estimatedSavings: openaiCost * 0.5,
        savingsPercent: 50,
        recommendation: 'Use GPT-4-Turbo for most tasks, GPT-3.5-Turbo for simple completions',
        implementation: 'Update model selection logic in script generation service',
      });
    }

    // Check Claude usage
    const claudeCost = await this.getServiceCost(CostService.CLAUDE, 30);
    if (claudeCost > 50) {
      recommendations.push({
        type: OptimizationType.MODEL_SELECTION,
        priority: Priority.MEDIUM,
        title: 'Optimize Claude model usage',
        description: `High Claude costs ($${claudeCost.toFixed(2)}/month). Consider using Claude Haiku for simpler tasks.`,
        currentCost: claudeCost,
        estimatedSavings: claudeCost * 0.4,
        savingsPercent: 40,
        recommendation: 'Use Claude Haiku for blog outlines, Claude Sonnet for full posts',
        implementation: 'Add model selection logic based on task complexity',
      });
    }

    return recommendations;
  }

  /**
   * Get total cost for a service in last N days
   */
  private async getServiceCost(service: CostService, days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.costEntry.aggregate({
      where: {
        service,
        timestamp: {
          gte: startDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  /**
   * Create optimization recommendation
   */
  private async createOptimization(data: {
    type: OptimizationType;
    priority: Priority;
    title: string;
    description: string;
    currentCost: number;
    estimatedSavings: number;
    savingsPercent: number;
    recommendation: string;
    implementation: string;
  }) {
    return this.prisma.costOptimization.create({
      data: {
        ...data,
        status: OptimizationStatus.PENDING,
      },
    });
  }

  /**
   * Get pending optimizations
   */
  async getPendingOptimizations() {
    return this.prisma.costOptimization.findMany({
      where: {
        status: OptimizationStatus.PENDING,
      },
      orderBy: [{ priority: 'desc' }, { estimatedSavings: 'desc' }],
    });
  }

  /**
   * Apply an optimization
   */
  async applyOptimization(id: string, appliedBy?: string) {
    return this.prisma.costOptimization.update({
      where: { id },
      data: {
        status: OptimizationStatus.APPLIED,
        appliedAt: new Date(),
        appliedBy,
      },
    });
  }

  /**
   * Reject an optimization
   */
  async rejectOptimization(id: string) {
    return this.prisma.costOptimization.update({
      where: { id },
      data: {
        status: OptimizationStatus.REJECTED,
      },
    });
  }
}
