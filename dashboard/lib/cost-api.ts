import useSWR from 'swr';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Generic fetcher for SWR
export const fetcher = async (url: string) => {
  const response = await fetch(`${API_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }

  return response.json();
};

// TypeScript Interfaces
export interface CostEntry {
  id: string;
  timestamp: Date;
  provider: 'openai' | 'claude' | 'elevenlabs' | 'pikalabs' | 'dalle';
  service: string;
  cost: number;
  tokens?: number;
  metadata?: Record<string, any>;
}

export interface DashboardData {
  today: { total: number; breakdown: Record<string, number> };
  week: { total: number; breakdown: Record<string, number> };
  month: { total: number; breakdown: Record<string, number> };
  avgPerDay: number;
  projectedMonth: number;
  recentEntries: CostEntry[];
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'critical';
  message: string;
  timestamp: Date;
  threshold: number;
}

export interface BudgetStatus {
  daily: { limit: number; spent: number; remaining: number; percentage: number };
  monthly: { limit: number; spent: number; remaining: number; percentage: number };
  alerts: Alert[];
}

export interface TrendData {
  date: string;
  openai: number;
  claude: number;
  elevenlabs: number;
  pikalabs: number;
  dalle: number;
  total: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  estimatedSavings: number;
  impact: 'low' | 'medium' | 'high';
  status: 'pending' | 'applied' | 'rejected';
  createdAt: Date;
}

export interface OptimizationsData {
  recommendations: Recommendation[];
  totalSaved: number;
}

export interface BudgetConfig {
  dailyLimit: number;
  monthlyLimit: number;
  thresholds: { warning: number; danger: number; critical: number };
  notifications: { email: boolean; slack: boolean };
  emergencyShutdown: boolean;
}

export interface ReportData {
  summary: { total: number; byProvider: Record<string, number> };
  entries: CostEntry[];
  dateRange: { from: string; to: string };
}

// SWR Hooks
export function useDashboard(refreshInterval = 30000) {
  return useSWR<DashboardData>('/cost-tracking/dashboard', fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useBudgetStatus(refreshInterval = 30000) {
  return useSWR<BudgetStatus>('/cost-tracking/budget/status', fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
  });
}

export function useTrends(days = 30, refreshInterval = 60000) {
  return useSWR<{ data: TrendData[] }>(`/cost-tracking/trends?days=${days}`, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
  });
}

export function useOptimizations(refreshInterval = 60000) {
  return useSWR<OptimizationsData>('/cost-tracking/optimizations', fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
  });
}

export function useBudgetConfig() {
  return useSWR<BudgetConfig>('/cost-tracking/budget/config', fetcher, {
    revalidateOnFocus: false,
  });
}

export function useReport(from?: string, to?: string, format: 'json' | 'csv' = 'json') {
  const query = from && to ? `?from=${from}&to=${to}&format=${format}` : null;
  return useSWR<ReportData>(query ? `/cost-tracking/reports${query}` : null, fetcher, {
    revalidateOnFocus: false,
  });
}

// API Mutation Functions
export async function updateBudgetConfig(config: BudgetConfig): Promise<{ success: boolean; config: BudgetConfig }> {
  const response = await fetch(`${API_URL}/cost-tracking/budget/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('Failed to update budget configuration');
  }

  return response.json();
}

export async function applyOptimization(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/cost-tracking/optimizations/${id}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to apply optimization');
  }

  return response.json();
}

export async function rejectOptimization(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/cost-tracking/optimizations/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to reject optimization');
  }

  return response.json();
}

export async function exportReport(from: string, to: string, format: 'json' | 'csv'): Promise<Blob> {
  const response = await fetch(`${API_URL}/cost-tracking/reports?from=${from}&to=${to}&format=${format}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export report');
  }

  return response.blob();
}
