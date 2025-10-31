'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getProviderColor, getProviderName, formatCost } from '@/lib/cost-utils';
import { format } from 'date-fns';
import type { TrendData } from '@/lib/cost-api';

interface CostTrendChartProps {
  data: TrendData[];
  loading?: boolean;
  className?: string;
}

const providers = ['openai', 'claude', 'elevenlabs', 'pikalabs', 'dalle'];

export function CostTrendChart({ data, loading = false, className }: CostTrendChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Cost Trend (30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-pulse w-full space-y-4">
            <div className="h-64 w-full bg-muted rounded" />
            <div className="flex gap-4 justify-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 w-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Cost Trend (30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <p>No trend data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{format(new Date(label), 'MMM dd, yyyy')}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}:</span>
              <span className="font-semibold">{formatCost(entry.value)}</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t text-sm font-semibold">
            Total: {formatCost(payload.reduce((sum: number, p: any) => sum + p.value, 0))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Cost Trend (30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(new Date(date), 'MMM dd')}
              className="text-xs"
            />
            <YAxis
              tickFormatter={(value) => `$${value}`}
              className="text-xs"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => getProviderName(value)}
            />
            {providers.map((provider) => (
              <Line
                key={provider}
                type="monotone"
                dataKey={provider}
                stroke={getProviderColor(provider)}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={500}
                name={provider}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Period Total</p>
            <p className="text-lg font-bold">
              {formatCost(data.reduce((sum, d) => sum + d.total, 0))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Daily Average</p>
            <p className="text-lg font-bold">
              {formatCost(data.reduce((sum, d) => sum + d.total, 0) / data.length)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Highest Day</p>
            <p className="text-lg font-bold">
              {formatCost(Math.max(...data.map((d) => d.total)))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
