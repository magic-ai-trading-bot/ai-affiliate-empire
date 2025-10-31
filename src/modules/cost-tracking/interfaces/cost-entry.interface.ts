import { CostService } from '@prisma/client';

export interface CostEntryData {
  service: CostService;
  operation: string;
  amount: number;
  currency?: string;
  tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  duration?: number;
  storageBytes?: bigint;
  computeMinutes?: number;
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, any>;
  provider: string;
  model?: string;
}

export interface CostEntryDetails {
  tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  duration?: number;
  storageBytes?: bigint;
  computeMinutes?: number;
  model?: string;
  provider: string;
}

export interface ServiceCostBreakdown {
  service: CostService;
  serviceName: string;
  totalCost: number;
  percentage: number;
  count: number;
}

export interface CostTrend {
  date: string;
  cost: number;
  budget: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  totalCost: number;
  dailyAverages: number;
  projectedTotal: number;
  breakdown: ServiceCostBreakdown[];
}

export interface BudgetStatus {
  currentSpend: number;
  monthlyLimit: number;
  dailyLimit: number;
  percentUsed: number;
  remainingBudget: number;
  daysRemaining: number;
  averageDailySpend: number;
  projectedMonthEnd: number;
  isOverBudget: boolean;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
}

export interface AlertContext {
  currentSpend: number;
  monthlyLimit?: number;
  budgetLimit: number;
  dailyLimit?: number;
  percentUsed: number;
  threshold: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface DashboardData {
  budgetStatus: BudgetStatus;
  currentSpend: number;
  monthlyLimit: number;
  serviceBreakdown: ServiceCostBreakdown[];
  trends: CostTrend[];
  projection: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  alerts: any[];
  optimizations: any[];
  recentCosts: any[];
}
