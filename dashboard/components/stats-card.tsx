import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatsCard({ title, value, change, icon: Icon, iconColor }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', iconColor || 'text-muted-foreground')} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p
            className={cn(
              'text-xs',
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground',
            )}
          >
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}% from last week
          </p>
        )}
      </CardContent>
    </Card>
  );
}
