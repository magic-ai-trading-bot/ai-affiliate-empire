import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/database/prisma.service';
import { CostService } from '@prisma/client';
import {
  ServiceCostBreakdown,
  CostTrend,
  MonthlySummary,
} from '../interfaces/cost-entry.interface';
import { SERVICE_NAMES } from '../constants/pricing.constants';

@Injectable()
export class CostAggregatorService {
  private readonly logger = new Logger(CostAggregatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregate costs for a specific date
   */
  async aggregateDailyCosts(date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log(`Aggregating costs for ${date.toISOString().split('T')[0]}`);

    // Get all cost entries for the day
    const entries = await this.prisma.costEntry.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculate totals by service
    const serviceTotals = {
      openaiCost: 0,
      claudeCost: 0,
      elevenlabsCost: 0,
      pikaCost: 0,
      dalleCost: 0,
      storageCost: 0,
      databaseCost: 0,
      computeCost: 0,
      otherCost: 0,
    };

    let totalTokens = 0;
    let totalDuration = 0;
    let totalStorage = BigInt(0);
    let totalCompute = 0;

    for (const entry of entries) {
      const cost = Number(entry.amount);

      switch (entry.service) {
        case CostService.OPENAI:
          serviceTotals.openaiCost += cost;
          break;
        case CostService.CLAUDE:
          serviceTotals.claudeCost += cost;
          break;
        case CostService.ELEVENLABS:
          serviceTotals.elevenlabsCost += cost;
          break;
        case CostService.PIKA:
          serviceTotals.pikaCost += cost;
          break;
        case CostService.DALLE:
          serviceTotals.dalleCost += cost;
          break;
        case CostService.S3:
          serviceTotals.storageCost += cost;
          break;
        case CostService.DATABASE:
          serviceTotals.databaseCost += cost;
          break;
        case CostService.COMPUTE:
          serviceTotals.computeCost += cost;
          break;
        default:
          serviceTotals.otherCost += cost;
      }

      if (entry.tokens) totalTokens += entry.tokens;
      if (entry.duration) totalDuration += entry.duration;
      if (entry.storageBytes) totalStorage += entry.storageBytes;
      if (entry.computeMinutes) totalCompute += entry.computeMinutes;
    }

    const totalCost = Object.values(serviceTotals).reduce((sum, cost) => sum + cost, 0);

    // Count content generated
    const videosGenerated = await this.prisma.video.count({
      where: {
        generatedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const blogsGenerated = await this.prisma.blog.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Upsert daily summary
    const summary = await this.prisma.dailyCostSummary.upsert({
      where: { date: startOfDay },
      create: {
        date: startOfDay,
        ...serviceTotals,
        totalCost,
        totalTokens,
        totalDuration,
        totalStorage,
        totalCompute,
        videosGenerated,
        blogsGenerated,
      },
      update: {
        ...serviceTotals,
        totalCost,
        totalTokens,
        totalDuration,
        totalStorage,
        totalCompute,
        videosGenerated,
        blogsGenerated,
      },
    });

    this.logger.log(`Daily costs aggregated: $${totalCost.toFixed(2)}`);

    return summary;
  }

  /**
   * Cron job to aggregate yesterday's costs
   */
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateYesterdayCosts() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await this.aggregateDailyCosts(yesterday);
  }

  /**
   * Get monthly costs summary
   */
  async getMonthlyCosts(year: number, month: number): Promise<MonthlySummary> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const dailySummaries = await this.prisma.dailyCostSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const totalCost = dailySummaries.reduce((sum, day) => sum + Number(day.totalCost), 0);
    const dailyAverages = totalCost / dailySummaries.length || 0;

    // Calculate projected total for the month
    const today = new Date();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = today.getMonth() === month - 1 ? today.getDate() : daysInMonth;
    const projectedTotal = (totalCost / daysElapsed) * daysInMonth;

    // Calculate service breakdown
    const breakdown = await this.getServiceBreakdown(startDate, endDate);

    return {
      year,
      month,
      totalCost,
      dailyAverages,
      projectedTotal,
      breakdown,
    };
  }

  /**
   * Get current month total spend
   */
  async getCurrentMonthTotal(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await this.prisma.dailyCostSummary.aggregate({
      where: {
        date: {
          gte: startOfMonth,
        },
      },
      _sum: {
        totalCost: true,
      },
    });

    return Number(result._sum.totalCost || 0);
  }

  /**
   * Get current day total spend
   */
  async getCurrentDayTotal(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.costEntry.aggregate({
      where: {
        timestamp: {
          gte: today,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }

  /**
   * Get cost breakdown by service for a date range
   */
  async getServiceBreakdown(
    startDate: Date,
    endDate: Date,
  ): Promise<ServiceCostBreakdown[]> {
    const entries = await this.prisma.costEntry.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        service: true,
        amount: true,
      },
    });

    // Group by service
    const serviceMap = new Map<CostService, { total: number; count: number }>();

    for (const entry of entries) {
      const current = serviceMap.get(entry.service) || { total: 0, count: 0 };
      serviceMap.set(entry.service, {
        total: current.total + Number(entry.amount),
        count: current.count + 1,
      });
    }

    const totalCost = Array.from(serviceMap.values()).reduce((sum, s) => sum + s.total, 0);

    // Convert to breakdown array
    const breakdown: ServiceCostBreakdown[] = [];
    for (const [service, data] of serviceMap.entries()) {
      breakdown.push({
        service,
        serviceName: SERVICE_NAMES[service],
        totalCost: data.total,
        percentage: (data.total / totalCost) * 100,
        count: data.count,
      });
    }

    return breakdown.sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get cost trends for the last N days
   */
  async getCostTrends(days: number = 30): Promise<CostTrend[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailySummaries = await this.prisma.dailyCostSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get budget config
    const budgetConfig = await this.prisma.budgetConfig.findFirst({
      where: { isActive: true },
    });

    const dailyBudget = budgetConfig ? Number(budgetConfig.dailyLimit) : 14;

    return dailySummaries.map((summary) => ({
      date: summary.date.toISOString().split('T')[0],
      cost: Number(summary.totalCost),
      budget: dailyBudget,
    }));
  }

  /**
   * Get monthly projection based on current spend rate
   */
  async getMonthlyProjection(): Promise<number> {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = now.getDate();

    const currentTotal = await this.getCurrentMonthTotal();

    if (daysElapsed === 0) return 0;

    return (currentTotal / daysElapsed) * daysInMonth;
  }
}
