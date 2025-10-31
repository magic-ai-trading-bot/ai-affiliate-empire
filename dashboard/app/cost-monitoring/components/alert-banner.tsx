'use client';

import { useState } from 'react';
import { X, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAlertColor } from '@/lib/cost-utils';
import type { Alert } from '@/lib/cost-api';

interface AlertBannerProps {
  alerts: Alert[];
  dismissible?: boolean;
  onDismiss?: (alertId: string) => void;
}

export function AlertBanner({ alerts, dismissible = true, onDismiss }: AlertBannerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));

  if (visibleAlerts.length === 0) return null;

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'danger':
        return AlertCircle;
      case 'critical':
        return XCircle;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => {
        const Icon = getIcon(alert.type);
        return (
          <div
            key={alert.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border',
              getAlertColor(alert.type),
              'animate-in slide-in-from-top-2 duration-300'
            )}
            role="alert"
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alert.message}</p>
              <p className="text-xs opacity-80 mt-1">
                Threshold: {alert.threshold}% • {new Date(alert.timestamp).toLocaleString()}
              </p>
            </div>
            {dismissible && (
              <button
                onClick={() => handleDismiss(alert.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
