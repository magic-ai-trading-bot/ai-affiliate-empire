'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getStatusColor, formatCost } from '@/lib/cost-utils';
import { cn } from '@/lib/utils';

interface BudgetGaugeProps {
  title: string;
  spent: number;
  limit: number;
  loading?: boolean;
  className?: string;
}

export function BudgetGauge({ title, spent, limit, loading = false, className }: BudgetGaugeProps) {
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const remaining = Math.max(0, limit - spent);

  // Clamp percentage for display (can exceed 100%)
  const displayPercentage = Math.min(percentage, 100);
  const remainingPercentage = Math.max(0, 100 - displayPercentage);

  const data = [
    { name: 'Spent', value: displayPercentage },
    { name: 'Remaining', value: remainingPercentage },
  ];

  const statusColor = getStatusColor(percentage);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-40 w-40 rounded-full bg-muted" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-full h-48 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius="60%"
                outerRadius="80%"
                paddingAngle={0}
                dataKey="value"
                animationDuration={500}
              >
                <Cell fill={statusColor} />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className={cn('text-4xl font-bold', {
                'text-green-600 dark:text-green-400': percentage < 80,
                'text-yellow-600 dark:text-yellow-400': percentage >= 80 && percentage < 100,
                'text-red-600 dark:text-red-400': percentage >= 100,
              })}
            >
              {percentage.toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Used</div>
          </div>
        </div>

        {/* Stats */}
        <div className="w-full mt-6 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Spent</span>
            <span className="text-sm font-semibold">{formatCost(spent)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Limit</span>
            <span className="text-sm font-semibold">{formatCost(limit)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm font-medium">
              {percentage >= 100 ? 'Over Budget' : 'Remaining'}
            </span>
            <span
              className={cn('text-sm font-bold', {
                'text-green-600 dark:text-green-400': percentage < 80,
                'text-yellow-600 dark:text-yellow-400': percentage >= 80 && percentage < 100,
                'text-red-600 dark:text-red-400': percentage >= 100,
              })}
            >
              {percentage >= 100 ? `-${formatCost(spent - limit)}` : formatCost(remaining)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
