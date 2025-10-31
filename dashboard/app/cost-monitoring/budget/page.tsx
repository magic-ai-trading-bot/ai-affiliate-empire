'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, AlertTriangle, Bell, Power } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useBudgetConfig, updateBudgetConfig } from '@/lib/cost-api';
import type { BudgetConfig } from '@/lib/cost-api';
import { formatCost } from '@/lib/cost-utils';

export default function BudgetConfigPage() {
  const router = useRouter();
  const { data: config, mutate, isLoading } = useBudgetConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  const [formData, setFormData] = useState<BudgetConfig>({
    dailyLimit: 50,
    monthlyLimit: 1000,
    thresholds: {
      warning: 80,
      danger: 100,
      critical: 150,
    },
    notifications: {
      email: false,
      slack: false,
    },
    emergencyShutdown: false,
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = async () => {
    // Validation
    if (formData.dailyLimit <= 0 || formData.monthlyLimit <= 0) {
      toast.error('Budget limits must be greater than 0');
      return;
    }

    if (formData.dailyLimit * 30 > formData.monthlyLimit * 1.5) {
      toast.error('Daily limit seems too high compared to monthly limit');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateBudgetConfig(formData);
      if (result.success) {
        mutate(result.config, false);
        toast.success('Budget configuration saved successfully');
      } else {
        toast.error('Failed to save budget configuration');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(
        `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmergencyToggle = (enabled: boolean) => {
    if (enabled && !showEmergencyConfirm) {
      setShowEmergencyConfirm(true);
    } else {
      setFormData({ ...formData, emergencyShutdown: enabled });
      setShowEmergencyConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="grid gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Budget Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage spending limits and alert thresholds
          </p>
        </div>
        <Button onClick={() => router.push('/cost-monitoring')} variant="outline" size="sm">
          Back to Dashboard
        </Button>
      </div>

      {/* Budget Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Limits</CardTitle>
          <CardDescription>Set daily and monthly spending limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="daily-limit">Daily Budget Limit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  id="daily-limit"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.dailyLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, dailyLimit: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-7 pr-4 py-2 border rounded-md bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {formatCost(formData.dailyLimit)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly-limit">Monthly Budget Limit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <input
                  id="monthly-limit"
                  type="number"
                  min="0"
                  step="10"
                  value={formData.monthlyLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, monthlyLimit: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-7 pr-4 py-2 border rounded-md bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {formatCost(formData.monthlyLimit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Thresholds
          </CardTitle>
          <CardDescription>Configure when to receive budget alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Warning Threshold</Label>
                <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  {formData.thresholds.warning}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.thresholds.warning}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thresholds: {
                      ...formData.thresholds,
                      warning: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Alert when budget reaches {formData.thresholds.warning}%
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Danger Threshold</Label>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {formData.thresholds.danger}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                value={formData.thresholds.danger}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thresholds: {
                      ...formData.thresholds,
                      danger: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Alert when budget reaches {formData.thresholds.danger}%
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Critical Threshold</Label>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {formData.thresholds.critical}%
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="200"
                value={formData.thresholds.critical}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thresholds: {
                      ...formData.thresholds,
                      critical: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Critical alert when budget reaches {formData.thresholds.critical}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Choose how to receive budget alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={formData.notifications.email}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, email: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="slack-notifications">Slack Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts via Slack
              </p>
            </div>
            <Switch
              id="slack-notifications"
              checked={formData.notifications.slack}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, slack: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Shutdown */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Power className="h-5 w-5" />
            Emergency Shutdown
          </CardTitle>
          <CardDescription>
            Automatically pause AI operations when critical threshold is exceeded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emergency-shutdown">Enable Emergency Shutdown</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Requires confirmation to enable
              </p>
            </div>
            <Switch
              id="emergency-shutdown"
              checked={formData.emergencyShutdown}
              onCheckedChange={handleEmergencyToggle}
            />
          </div>

          {showEmergencyConfirm && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
                Are you sure you want to enable emergency shutdown?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleEmergencyToggle(true)}
                >
                  Yes, Enable
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmergencyConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="gap-2">
          <Save className="h-5 w-5" />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
