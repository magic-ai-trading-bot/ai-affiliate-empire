'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from './components/stat-card';
import { AlertBanner } from './components/alert-banner';
import { BudgetGauge } from './components/budget-gauge';
import { CostBreakdownChart } from './components/cost-breakdown-chart';
import { CostTrendChart } from './components/cost-trend-chart';
import { CostEntriesTable } from './components/cost-entries-table';
import { useDashboard, useBudgetStatus, useTrends } from '@/lib/cost-api';
import { formatCost, calculateChange } from '@/lib/cost-utils';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={resetErrorBoundary}>Try again</Button>
      </div>
    </div>
  );
}

function DashboardContent() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch data with SWR
  const {
    data: dashboard,
    error: dashboardError,
    isLoading: dashboardLoading,
    mutate: refreshDashboard,
  } = useDashboard(30000);

  const {
    data: budgetStatus,
    error: budgetError,
    isLoading: budgetLoading,
  } = useBudgetStatus(30000);

  const {
    data: trendsData,
    error: trendsError,
    isLoading: trendsLoading,
  } = useTrends(30, 60000);

  const handleRefresh = () => {
    refreshDashboard();
    setLastUpdated(new Date());
  };

  const isLoading = dashboardLoading || budgetLoading;
  const hasError = dashboardError || budgetError || trendsError;

  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Failed to load cost monitoring data
          </h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            {dashboardError?.message || budgetError?.message || trendsError?.message}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cost Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Alert Banners */}
      {budgetStatus?.alerts && budgetStatus.alerts.length > 0 && (
        <AlertBanner alerts={budgetStatus.alerts} />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Cost"
          value={dashboard ? formatCost(dashboard.today.total) : '-'}
          change={
            dashboard
              ? calculateChange(dashboard.today.total, dashboard.week.total / 7)
              : undefined
          }
          icon={DollarSign}
          iconColor="text-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="This Week's Cost"
          value={dashboard ? formatCost(dashboard.week.total) : '-'}
          change={
            dashboard
              ? calculateChange(dashboard.week.total, dashboard.month.total / 4)
              : undefined
          }
          icon={TrendingUp}
          iconColor="text-green-500"
          loading={isLoading}
        />
        <StatCard
          title="This Month's Cost"
          value={dashboard ? formatCost(dashboard.month.total) : '-'}
          icon={Calendar}
          iconColor="text-purple-500"
          loading={isLoading}
        />
        <StatCard
          title="Projected Month"
          value={dashboard ? formatCost(dashboard.projectedMonth) : '-'}
          description={
            dashboard
              ? `Based on ${formatCost(dashboard.avgPerDay)} avg/day`
              : undefined
          }
          icon={TrendingUp}
          iconColor="text-orange-500"
          loading={isLoading}
        />
      </div>

      {/* Budget Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetGauge
          title="Daily Budget"
          spent={budgetStatus?.daily.spent || 0}
          limit={budgetStatus?.daily.limit || 0}
          loading={budgetLoading}
        />
        <BudgetGauge
          title="Monthly Budget"
          spent={budgetStatus?.monthly.spent || 0}
          limit={budgetStatus?.monthly.limit || 0}
          loading={budgetLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <CostBreakdownChart
          data={dashboard?.month.breakdown || {}}
          loading={dashboardLoading}
          className="lg:col-span-2"
        />
        <CostTrendChart
          data={trendsData?.data || []}
          loading={trendsLoading}
          className="lg:col-span-3"
        />
      </div>

      {/* Recent Entries Table */}
      <CostEntriesTable
        entries={dashboard?.recentEntries || []}
        loading={dashboardLoading}
      />
    </div>
  );
}

export default function CostMonitoringPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DashboardContent />
    </ErrorBoundary>
  );
}
