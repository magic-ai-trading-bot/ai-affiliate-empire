'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Video, Users, Play } from 'lucide-react';
import { StatsCard } from '@/components/stats-card';
import { RevenueChart } from '@/components/revenue-chart';
import { TopProducts } from '@/components/top-products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardAPI } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function Dashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowRunning, setWorkflowRunning] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [overviewData, revenueData, productsData] = await Promise.all([
        dashboardAPI.getOverview(),
        dashboardAPI.getRevenue(7),
        dashboardAPI.getTopProducts(),
      ]);

      setOverview(overviewData);
      setRevenueData(revenueData);
      setTopProducts(productsData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  }

  async function startWorkflow() {
    setWorkflowRunning(true);
    try {
      await dashboardAPI.startWorkflow();
      alert('Daily control loop started successfully!');
    } catch (error) {
      console.error('Failed to start workflow:', error);
      alert('Failed to start workflow');
    } finally {
      setWorkflowRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading Dashboard...</div>
          <div className="text-muted-foreground">Fetching your empire stats</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <h1 className="text-3xl font-bold tracking-tight">AI Affiliate Empire</h1>
          <div className="ml-auto flex items-center space-x-4">
            <Button onClick={startWorkflow} disabled={workflowRunning}>
              <Play className="mr-2 h-4 w-4" />
              {workflowRunning ? 'Running...' : 'Start Daily Loop'}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(overview?.revenue?.total || 0)}
            change={overview?.revenue?.growth}
            icon={DollarSign}
            iconColor="text-green-600"
          />
          <StatsCard
            title="Active Products"
            value={overview?.products?.active || 0}
            icon={TrendingUp}
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Videos Ready"
            value={overview?.content?.videosReady || 0}
            icon={Video}
            iconColor="text-purple-600"
          />
          <StatsCard
            title="Published"
            value={overview?.content?.published || 0}
            icon={Users}
            iconColor="text-orange-600"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {revenueData && <RevenueChart data={revenueData.data || []} />}
          <TopProducts products={topProducts} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Run</span>
                  <span className="text-sm font-medium">
                    {new Date(overview?.timestamp || Date.now()).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-green-600">Healthy</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(overview?.revenue?.lastWeek || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formatNumber(revenueData?.totals?.clicks || 0)} clicks,{' '}
                {revenueData?.totals?.conversions || 0} conversions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.products?.topPerformers?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Products with ROI {'>'} 100%
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
