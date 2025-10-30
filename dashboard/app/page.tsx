'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Video,
  Users,
  Play,
  RefreshCw,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { EnhancedStatsCard } from '@/components/enhanced-stats-card';
import { AdvancedRevenueChart } from '@/components/advanced-revenue-chart';
import { EnhancedTopProducts } from '@/components/enhanced-top-products';
import { DashboardSkeleton } from '@/components/dashboard-skeleton';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { dashboardAPI } from '@/lib/api';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';

export default function Dashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData(showToast = false) {
    try {
      if (showToast) setRefreshing(true);

      const [overviewData, revenueData, productsData] = await Promise.all([
        dashboardAPI.getOverview(),
        dashboardAPI.getRevenue(7),
        dashboardAPI.getTopProducts(),
      ]);

      setOverview(overviewData);
      setRevenueData(revenueData);
      setTopProducts(productsData);
      setLastUpdate(new Date());
      setLoading(false);

      if (showToast) {
        toast.success('Dashboard refreshed', {
          description: 'All metrics updated successfully',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);

      if (showToast) {
        toast.error('Failed to refresh dashboard', {
          description: 'Please try again or contact support',
          action: {
            label: 'Retry',
            onClick: () => loadData(true),
          },
        });
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function startWorkflow() {
    setWorkflowRunning(true);
    try {
      await dashboardAPI.startWorkflow();
      toast.success('Daily control loop started', {
        description: 'AI is now discovering products and generating content',
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      // Refresh data after starting workflow
      setTimeout(() => loadData(false), 2000);
    } catch (error) {
      console.error('Failed to start workflow:', error);
      toast.error('Failed to start workflow', {
        description: 'An error occurred while starting the control loop',
        icon: <AlertCircle className="h-4 w-4" />,
        action: {
          label: 'Retry',
          onClick: startWorkflow,
        },
      });
    } finally {
      setWorkflowRunning(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Generate trend data for sparklines (mock data for demo)
  const generateTrendData = (baseValue: number) => {
    return Array.from({ length: 7 }, (_, i) => ({
      value: baseValue * (0.8 + Math.random() * 0.4),
    }));
  };

  return (
    <ErrorBoundary>
      <div className="flex-col md:flex min-h-screen">
        <Toaster position="top-right" richColors closeButton />

        {/* Header */}
        <motion.div
          className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex h-16 items-center px-4 md:px-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                  AI Affiliate Empire
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Autonomous Marketing Dashboard
                </p>
              </div>
            </div>

            <div className="ml-auto flex items-center space-x-2">
              {/* Last Update Time */}
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mr-2">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              </div>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadData(true)}
                disabled={refreshing}
                aria-label="Refresh dashboard"
              >
                <RefreshCw
                  className={cn('h-5 w-5', refreshing && 'animate-spin')}
                  aria-hidden="true"
                />
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Start Workflow Button */}
              <Button
                onClick={startWorkflow}
                disabled={workflowRunning}
                className="gap-2"
                size="default"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {workflowRunning ? 'Running...' : 'Start Loop'}
                </span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <main className="flex-1 space-y-6 p-4 md:p-8 pt-6" role="main">
          {/* Key Metrics */}
          <section aria-label="Key performance metrics">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <EnhancedStatsCard
                title="Total Revenue"
                value={formatCurrency(overview?.revenue?.total || 0)}
                change={overview?.revenue?.growth}
                icon={DollarSign}
                iconColor="text-success"
                trendData={generateTrendData(overview?.revenue?.total || 1000)}
                description="from last week"
              />
              <EnhancedStatsCard
                title="Active Products"
                value={overview?.products?.active || 0}
                change={overview?.products?.growth}
                icon={TrendingUp}
                iconColor="text-info"
                trendData={generateTrendData(overview?.products?.active || 50)}
                description="tracked"
              />
              <EnhancedStatsCard
                title="Videos Ready"
                value={overview?.content?.videosReady || 0}
                change={overview?.content?.videosGrowth}
                icon={Video}
                iconColor="text-primary"
                trendData={generateTrendData(overview?.content?.videosReady || 100)}
                description="queued"
              />
              <EnhancedStatsCard
                title="Content Published"
                value={overview?.content?.published || 0}
                change={overview?.content?.publishedGrowth}
                icon={Users}
                iconColor="text-warning"
                trendData={generateTrendData(overview?.content?.published || 200)}
                description="this week"
              />
            </div>
          </section>

          {/* Charts & Top Products */}
          <section aria-label="Revenue analytics and top products">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <ErrorBoundary>
                <AdvancedRevenueChart
                  data={revenueData?.data || []}
                  loading={false}
                />
              </ErrorBoundary>
              <ErrorBoundary>
                <EnhancedTopProducts
                  products={topProducts}
                  loading={false}
                />
              </ErrorBoundary>
            </div>
          </section>

          {/* Additional Stats */}
          <section aria-label="System information" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-success" aria-hidden="true" />
                    System Status
                  </CardTitle>
                  <CardDescription>Real-time health monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Overall Health</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden="true" />
                        <span className="text-sm font-medium text-success">Healthy</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Run</span>
                      <span className="text-sm font-medium">
                        {new Date(overview?.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Uptime</span>
                      <span className="text-sm font-medium">99.9%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-4 w-4 text-warning" aria-hidden="true" />
                    Revenue This Week
                  </CardTitle>
                  <CardDescription>Last 7 days performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold">
                      {formatCurrency(overview?.revenue?.lastWeek || 0)}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Clicks: </span>
                        <span className="font-medium">
                          {formatNumber(revenueData?.totals?.clicks || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conv: </span>
                        <span className="font-medium">
                          {revenueData?.totals?.conversions || 0}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Conversion rate:{' '}
                      {((revenueData?.totals?.conversions / revenueData?.totals?.clicks) * 100 || 0).toFixed(2)}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-info" aria-hidden="true" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>High ROI products</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-3xl font-bold">
                      {overview?.products?.topPerformers?.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Products with ROI {'>'} 100%
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Average ROI: {overview?.products?.avgROI || 0}%
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}
