import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { CostRecorderService } from './services/cost-recorder.service';
import { CostAggregatorService } from './services/cost-aggregator.service';
import { BudgetMonitorService } from './services/budget-monitor.service';
import { AlertService } from './services/alert.service';
import { OptimizationService } from './services/optimization.service';
import { RecordCostDto } from './dto/record-cost.dto';
import { UpdateBudgetConfigDto } from './dto/budget-config.dto';
import { DateRangeDto, ExportOptionsDto } from './dto/date-range.dto';
import { DashboardData } from './interfaces/cost-entry.interface';

@Injectable()
export class CostTrackingService {
  private readonly logger = new Logger(CostTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recorder: CostRecorderService,
    private readonly aggregator: CostAggregatorService,
    private readonly budgetMonitor: BudgetMonitorService,
    private readonly alertService: AlertService,
    private readonly optimization: OptimizationService,
  ) {}

  // ============================================================================
  // Dashboard & Overview
  // ============================================================================

  async getDashboardData(): Promise<DashboardData> {
    const budgetStatus = await this.budgetMonitor.getCurrentBudgetStatus();
    const serviceBreakdown = await this.aggregator.getServiceBreakdown(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date(),
    );
    const trends = await this.aggregator.getCostTrends(30);
    const recentCosts = await this.recorder.getRecentCosts(10);
    const optimizations = await this.optimization.getPendingOptimizations();

    const alerts = await this.prisma.budgetAlert.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const dailyProjection = await this.aggregator.getCurrentDayTotal();
    const monthlyProjection = await this.aggregator.getMonthlyProjection();

    return {
      budgetStatus,
      currentSpend: budgetStatus.currentSpend,
      monthlyLimit: budgetStatus.monthlyLimit,
      serviceBreakdown,
      trends,
      projection: {
        daily: dailyProjection,
        weekly: dailyProjection * 7,
        monthly: monthlyProjection,
      },
      alerts,
      optimizations,
      recentCosts,
    };
  }

  async getBudgetStatus() {
    return this.budgetMonitor.getCurrentBudgetStatus();
  }

  // ============================================================================
  // Cost Recording
  // ============================================================================

  async recordCost(dto: RecordCostDto) {
    return this.recorder.recordCost(dto);
  }

  async getRecentCosts(limit: number = 100) {
    return this.recorder.getRecentCosts(limit);
  }

  // ============================================================================
  // Cost Summaries
  // ============================================================================

  async getDailySummary(dateString: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.aggregator.aggregateDailyCosts(date);
  }

  async getMonthlySummary(year: number, month: number) {
    return this.aggregator.getMonthlyCosts(year, month);
  }

  async getCurrentMonthTotal() {
    return this.aggregator.getCurrentMonthTotal();
  }

  async getCurrentDayTotal() {
    return this.aggregator.getCurrentDayTotal();
  }

  // ============================================================================
  // Cost Breakdowns
  // ============================================================================

  async getServiceBreakdown(dateRange: DateRangeDto) {
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();

    return this.aggregator.getServiceBreakdown(startDate, endDate);
  }

  async getResourceBreakdown(resourceId: string) {
    const costs = await this.recorder.getCostsByResource(resourceId);
    const total = await this.recorder.getTotalCostForResource(resourceId);

    return {
      resourceId,
      costs,
      total,
    };
  }

  // ============================================================================
  // Trends & Projections
  // ============================================================================

  async getCostTrends(days: number = 30) {
    return this.aggregator.getCostTrends(days);
  }

  async getMonthlyProjection() {
    return this.aggregator.getMonthlyProjection();
  }

  // ============================================================================
  // Optimizations
  // ============================================================================

  async getOptimizations(status?: string) {
    if (status) {
      return this.prisma.costOptimization.findMany({
        where: { status: status as any },
        orderBy: [{ priority: 'desc' }, { estimatedSavings: 'desc' }],
      });
    }

    return this.optimization.getPendingOptimizations();
  }

  async applyOptimization(id: string) {
    return this.optimization.applyOptimization(id);
  }

  async rejectOptimization(id: string) {
    return this.optimization.rejectOptimization(id);
  }

  // ============================================================================
  // Reports
  // ============================================================================

  async getDailyReport(dateString: string) {
    const date = dateString ? new Date(dateString) : new Date();
    const summary = await this.getDailySummary(dateString);
    const breakdown = await this.aggregator.getServiceBreakdown(date, date);

    return {
      date: date.toISOString().split('T')[0],
      summary,
      breakdown,
    };
  }

  async getWeeklyReport() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const breakdown = await this.aggregator.getServiceBreakdown(startDate, endDate);
    const trends = await this.aggregator.getCostTrends(7);

    const totalCost = breakdown.reduce((sum, s) => sum + s.totalCost, 0);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalCost,
      breakdown,
      trends,
    };
  }

  async getMonthlyReport() {
    const now = new Date();
    const summary = await this.getMonthlySummary(now.getFullYear(), now.getMonth() + 1);

    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      ...summary,
    };
  }

  async exportReport(options: ExportOptionsDto) {
    const startDate = options.startDate ? new Date(options.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = options.endDate ? new Date(options.endDate) : new Date();

    const entries = await this.prisma.costEntry.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (options.format === 'json') {
      return entries;
    }

    // Convert to CSV
    const csv = this.convertToCSV(entries);
    return { csv };
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).join(',')).join('\n');

    return `${headers}\n${rows}`;
  }

  // ============================================================================
  // Budget Configuration
  // ============================================================================

  async getBudgetConfig() {
    return this.prisma.budgetConfig.findFirst({
      where: { isActive: true },
    });
  }

  async updateBudgetConfig(dto: UpdateBudgetConfigDto) {
    const config = await this.getBudgetConfig();

    if (!config) {
      throw new NotFoundException('Budget configuration not found');
    }

    return this.prisma.budgetConfig.update({
      where: { id: config.id },
      data: dto,
    });
  }

  // ============================================================================
  // Alerts
  // ============================================================================

  async getAlerts(limit: number = 50, level?: string) {
    return this.prisma.budgetAlert.findMany({
      where: level ? { level: level as any } : {},
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendTestAlert() {
    const config = await this.getBudgetConfig();
    return this.alertService.testAlertChannels(config);
  }

  // ============================================================================
  // Manual Triggers
  // ============================================================================

  async triggerDailyAggregation(dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date();
    await this.aggregator.aggregateDailyCosts(date);

    return { success: true, date: date.toISOString().split('T')[0] };
  }

  async checkBudgetThresholds() {
    await this.budgetMonitor.checkBudgetThresholds();
    return { success: true };
  }

  async analyzeOptimizations() {
    await this.optimization.analyzeAndGenerateRecommendations();
    return { success: true };
  }
}
