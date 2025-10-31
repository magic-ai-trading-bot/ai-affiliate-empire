'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { getProviderColor, getProviderName, formatCost } from '@/lib/cost-utils';

interface CostBreakdownChartProps {
  data: Record<string, number>;
  loading?: boolean;
  className?: string;
}

export function CostBreakdownChart({ data, loading = false, className }: CostBreakdownChartProps) {
  const chartData = Object.entries(data).map(([provider, cost]) => ({
    name: getProviderName(provider),
    value: cost,
    provider,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Cost Breakdown by Provider</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-48 w-48 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-3 w-36 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Cost Breakdown by Provider</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80">
          <div className="text-center text-muted-foreground">
            <p>No cost data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCost(data.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Cost Breakdown by Provider</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              animationDuration={500}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getProviderColor(entry.provider)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value} - {formatCost(entry.payload.value)}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total */}
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold">{formatCost(total)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
