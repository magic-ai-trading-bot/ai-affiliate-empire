'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface EnhancedStatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  trendData?: Array<{ value: number }>;
  description?: string;
  loading?: boolean;
}

export function EnhancedStatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  trendData,
  description,
  loading = false,
}: EnhancedStatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 skeleton" />
          <div className="h-4 w-4 skeleton rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 skeleton mb-2" />
          <div className="h-3 w-40 skeleton" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div
            className={cn(
              'rounded-full p-2 transition-colors duration-300',
              'bg-muted group-hover:bg-primary/10'
            )}
          >
            <Icon className={cn('h-4 w-4', iconColor)} aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-2xl font-bold mb-1"
          >
            {value}
          </motion.div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {change !== undefined && (
                <>
                  {isPositive && <TrendingUp className="h-3 w-3 text-success" aria-hidden="true" />}
                  {isNegative && (
                    <TrendingDown className="h-3 w-3 text-destructive" aria-hidden="true" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isPositive && 'text-success',
                      isNegative && 'text-destructive',
                      !isPositive && !isNegative && 'text-muted-foreground'
                    )}
                  >
                    {change > 0 ? '+' : ''}
                    {change.toFixed(1)}%
                  </span>
                </>
              )}
              {description && (
                <span className="text-xs text-muted-foreground ml-1">{description}</span>
              )}
            </div>

            {trendData && trendData.length > 0 && (
              <div className="h-8 w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={
                        isPositive
                          ? 'hsl(var(--success))'
                          : isNegative
                            ? 'hsl(var(--destructive))'
                            : 'hsl(var(--primary))'
                      }
                      strokeWidth={1.5}
                      dot={false}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>

        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          aria-hidden="true"
        />
      </Card>
    </motion.div>
  );
}
