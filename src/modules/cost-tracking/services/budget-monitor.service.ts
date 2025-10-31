import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { AlertLevel } from '@prisma/client';
import { CostAggregatorService } from './cost-aggregator.service';
import { AlertService } from './alert.service';
import { BudgetStatus, AlertContext } from '../interfaces/cost-entry.interface';
import { ActionResult } from '../interfaces/alert-config.interface';

@Injectable()
export class BudgetMonitorService {
  private readonly logger = new Logger(BudgetMonitorService.name);
  private lastAlertLevel: AlertLevel | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aggregator: CostAggregatorService,
    private readonly alertService: AlertService,
  ) {}

  /**
   * Check budget thresholds and trigger alerts if needed
   * Should be called periodically (every 15 minutes)
   */
  async checkBudgetThresholds(): Promise<void> {
    try {
      const budgetStatus = await this.getCurrentBudgetStatus();

      this.logger.log(
        `Budget check: $${budgetStatus.currentSpend.toFixed(2)} / $${budgetStatus.monthlyLimit.toFixed(2)} (${budgetStatus.percentUsed}%)`,
      );

      // Determine alert level
      let alertLevel: AlertLevel | null = null;

      if (budgetStatus.alertLevel === 'EMERGENCY') {
        alertLevel = AlertLevel.EMERGENCY;
      } else if (budgetStatus.alertLevel === 'CRITICAL') {
        alertLevel = AlertLevel.CRITICAL;
      } else if (budgetStatus.alertLevel === 'WARNING') {
        alertLevel = AlertLevel.WARNING;
      }

      // Only alert if level changed or first time
      if (alertLevel && alertLevel !== this.lastAlertLevel) {
        await this.triggerAlert(alertLevel, budgetStatus);
        this.lastAlertLevel = alertLevel;
      }
    } catch (error) {
      this.logger.error(`Budget check failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Get current budget status
   */
  async getCurrentBudgetStatus(): Promise<BudgetStatus> {
    const config = await this.getActiveBudgetConfig();
    const currentSpend = await this.aggregator.getCurrentMonthTotal();
    const monthlyLimit = Number(config.monthlyLimit);
    const dailyLimit = Number(config.dailyLimit);

    const percentUsed = (currentSpend / monthlyLimit) * 100;
    const remainingBudget = Math.max(0, monthlyLimit - currentSpend);

    // Calculate days remaining in month
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.max(0, endOfMonth.getDate() - now.getDate());

    // Calculate average daily spend
    const daysElapsed = now.getDate();
    const averageDailySpend = daysElapsed > 0 ? currentSpend / daysElapsed : 0;

    // Project month-end spending
    const daysInMonth = endOfMonth.getDate();
    const projectedMonthEnd = (currentSpend / daysElapsed) * daysInMonth;

    // Determine alert level
    let alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY' = 'NORMAL';

    if (percentUsed >= config.emergencyThreshold) {
      alertLevel = 'EMERGENCY';
    } else if (percentUsed >= config.criticalThreshold) {
      alertLevel = 'CRITICAL';
    } else if (percentUsed >= config.warningThreshold) {
      alertLevel = 'WARNING';
    }

    return {
      currentSpend,
      monthlyLimit,
      dailyLimit,
      percentUsed: Math.round(percentUsed),
      remainingBudget,
      daysRemaining,
      averageDailySpend,
      projectedMonthEnd,
      isOverBudget: currentSpend > monthlyLimit,
      alertLevel,
    };
  }

  /**
   * Trigger budget alert and execute auto-actions
   */
  async triggerAlert(level: AlertLevel, budgetStatus: BudgetStatus): Promise<void> {
    const config = await this.getActiveBudgetConfig();

    this.logger.warn(`Budget alert triggered: ${level} - ${budgetStatus.percentUsed}% used`);

    // Create alert context
    const context: AlertContext = {
      currentSpend: budgetStatus.currentSpend,
      budgetLimit: budgetStatus.monthlyLimit,
      percentUsed: budgetStatus.percentUsed,
      threshold: this.getThresholdPercentage(level, config),
      periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    };

    // Execute auto-actions
    const actions = await this.executeAutoActions(level, config);

    // Create alert record
    const alert = await this.prisma.budgetAlert.create({
      data: {
        level,
        threshold: context.threshold,
        currentSpend: context.currentSpend,
        budgetLimit: context.budgetLimit,
        percentUsed: context.percentUsed,
        message: this.createAlertMessage(level, context),
        actionsTaken: actions as any,
        periodStart: context.periodStart,
        periodEnd: context.periodEnd,
      },
    });

    // Send notifications
    await this.alertService.sendAlert(alert, config);
  }

  /**
   * Execute automatic actions based on alert level
   */
  private async executeAutoActions(level: AlertLevel, config: any): Promise<ActionResult[]> {
    const actions: ActionResult[] = [];

    if (level === AlertLevel.EMERGENCY && config.emergencyStop) {
      // Emergency shutdown
      const action = await this.emergencyShutdown();
      actions.push(action);
    } else if (level === AlertLevel.CRITICAL && config.autoScaleDown) {
      // Scale down content generation
      const action = await this.scaleDownContentGeneration();
      actions.push(action);
    }

    return actions;
  }

  /**
   * Emergency shutdown - stop all workflows
   */
  async emergencyShutdown(): Promise<ActionResult> {
    this.logger.error('EMERGENCY SHUTDOWN TRIGGERED!');

    try {
      // Update system config to pause workflows
      await this.prisma.systemConfig.upsert({
        where: { key: 'workflows_paused' },
        create: {
          key: 'workflows_paused',
          value: 'true',
          description: 'Workflows paused due to budget emergency',
        },
        update: {
          value: 'true',
          description: 'Workflows paused due to budget emergency',
        },
      });

      return {
        action: 'emergency_shutdown',
        success: true,
        message: 'All workflows have been paused',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Emergency shutdown failed: ${error.message}`);
      return {
        action: 'emergency_shutdown',
        success: false,
        message: `Failed to pause workflows: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Scale down content generation (reduce rate)
   */
  private async scaleDownContentGeneration(): Promise<ActionResult> {
    this.logger.warn('Scaling down content generation');

    try {
      // Update system config to reduce generation rate
      await this.prisma.systemConfig.upsert({
        where: { key: 'content_generation_rate' },
        create: {
          key: 'content_generation_rate',
          value: '0.5',
          description: 'Reduced due to budget constraints',
        },
        update: {
          value: '0.5',
          description: 'Reduced due to budget constraints',
        },
      });

      return {
        action: 'scale_down_content',
        success: true,
        message: 'Content generation rate reduced to 50%',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Scale down failed: ${error.message}`);
      return {
        action: 'scale_down_content',
        success: false,
        message: `Failed to scale down: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get active budget configuration
   */
  private async getActiveBudgetConfig() {
    let config = await this.prisma.budgetConfig.findFirst({
      where: { isActive: true },
    });

    if (!config) {
      // Create default config if none exists
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      config = await this.prisma.budgetConfig.create({
        data: {
          monthlyLimit: 412,
          dailyLimit: 14,
          warningThreshold: 80,
          criticalThreshold: 100,
          emergencyThreshold: 150,
          emailAlerts: true,
          slackAlerts: false,
          emailRecipients: [],
          autoScaleDown: true,
          emergencyStop: true,
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
          isActive: true,
        },
      });
    }

    return config;
  }

  /**
   * Get threshold percentage for alert level
   */
  private getThresholdPercentage(level: AlertLevel, config: any): number {
    switch (level) {
      case AlertLevel.WARNING:
        return config.warningThreshold;
      case AlertLevel.CRITICAL:
        return config.criticalThreshold;
      case AlertLevel.EMERGENCY:
        return config.emergencyThreshold;
      default:
        return 0;
    }
  }

  /**
   * Create alert message
   */
  private createAlertMessage(level: AlertLevel, context: AlertContext): string {
    const percentage = context.percentUsed;
    const current = context.currentSpend.toFixed(2);
    const limit = context.budgetLimit.toFixed(2);

    switch (level) {
      case AlertLevel.WARNING:
        return `Budget warning: $${current} (${percentage}%) of $${limit} monthly limit reached.`;
      case AlertLevel.CRITICAL:
        return `Budget critical: $${current} (${percentage}%) of $${limit} monthly limit reached!`;
      case AlertLevel.EMERGENCY:
        return `BUDGET EMERGENCY: $${current} (${percentage}%) exceeds $${limit} monthly limit! Emergency actions triggered.`;
      default:
        return `Budget alert: $${current} / $${limit}`;
    }
  }
}
