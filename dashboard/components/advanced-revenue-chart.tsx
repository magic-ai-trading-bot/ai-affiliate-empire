'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, AreaChart as AreaChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface ChartData {
  date: string;
  revenue: number;
  clicks: number;
  conversions: number;
}

interface AdvancedRevenueChartProps {
  data: ChartData[];
  loading?: boolean;
}

type ChartType = 'line' | 'area' | 'bar';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 animate-fade-in">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              {entry.name}:
            </span>
            <span className="font-semibold">
              {entry.name === 'revenue'
                ? formatCurrency(entry.value)
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AdvancedRevenueChart({ data, loading = false }: AdvancedRevenueChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [visibleLines, setVisibleLines] = useState({
    revenue: true,
    clicks: true,
    conversions: true,
  });

  if (loading) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <div className="h-6 w-32 skeleton" />
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[350px] flex items-end gap-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="skeleton flex-1"
                style={{ height: `${30 + Math.random() * 70}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const xAxisProps = {
      dataKey: 'date',
      stroke: 'hsl(var(--muted-foreground))',
      fontSize: 12,
      tickLine: false,
      axisLine: false,
    };

    const yAxisProps = {
      stroke: 'hsl(var(--muted-foreground))',
      fontSize: 12,
      tickLine: false,
      axisLine: false,
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              onClick={(e) => toggleLine(e.dataKey as keyof typeof visibleLines)}
              wrapperStyle={{ cursor: 'pointer' }}
            />
            {visibleLines.revenue && (
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
                animationDuration={1000}
              />
            )}
            {visibleLines.clicks && (
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#colorClicks)"
                strokeWidth={2}
                animationDuration={1000}
              />
            )}
            {visibleLines.conversions && (
              <Area
                type="monotone"
                dataKey="conversions"
                stroke="hsl(var(--chart-3))"
                fillOpacity={1}
                fill="url(#colorConversions)"
                strokeWidth={2}
                animationDuration={1000}
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              onClick={(e) => toggleLine(e.dataKey as keyof typeof visibleLines)}
              wrapperStyle={{ cursor: 'pointer' }}
            />
            {visibleLines.revenue && (
              <Bar
                dataKey="revenue"
                fill="hsl(var(--chart-1))"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              />
            )}
            {visibleLines.clicks && (
              <Bar
                dataKey="clicks"
                fill="hsl(var(--chart-2))"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              />
            )}
            {visibleLines.conversions && (
              <Bar
                dataKey="conversions"
                fill="hsl(var(--chart-3))"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              />
            )}
          </BarChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              onClick={(e) => toggleLine(e.dataKey as keyof typeof visibleLines)}
              wrapperStyle={{ cursor: 'pointer' }}
            />
            {visibleLines.revenue && (
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            )}
            {visibleLines.clicks && (
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            )}
            {visibleLines.conversions && (
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-3))', r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <Card className="col-span-4">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription className="mt-1">
              Track revenue, clicks, and conversions over time
            </CardDescription>
          </div>
          <div className="flex gap-1" role="group" aria-label="Chart type selector">
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setChartType('line')}
              aria-label="Line chart"
              className="h-8 w-8"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setChartType('area')}
              aria-label="Area chart"
              className="h-8 w-8"
            >
              <AreaChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setChartType('bar')}
              aria-label="Bar chart"
              className="h-8 w-8"
            >
              <BarChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          {renderChart()}
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-4 px-4">
          Click legend items to show/hide metrics. Switch chart types using the buttons above.
        </p>
      </CardContent>
    </Card>
  );
}
