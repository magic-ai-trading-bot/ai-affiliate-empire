'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Download,
  Trash2,
  Shield,
  Cookie,
  FileText,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [ftcDisclosure, setFtcDisclosure] = useState(true);
  const [gdprConsent, setGdprConsent] = useState({
    analytics: true,
    marketing: false,
    functional: true,
    advertising: true,
  });
  const [loading, setLoading] = useState(false);

  const handleExportData = async () => {
    setLoading(true);
    try {
      // In production, this would call the GDPR API
      const response = await fetch('/api/users/current/data');
      const data = await response.json();

      // Create download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully', {
        description: 'Your data has been downloaded',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed', {
        description: 'Unable to export your data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all your data? This action cannot be undone.'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'This will permanently delete your account and all associated data. Type DELETE to confirm.'
    );

    if (!doubleConfirm) return;

    setLoading(true);
    try {
      await fetch('/api/users/current/data', { method: 'DELETE' });

      toast.success('Data deletion request submitted', {
        description: 'Your data will be deleted within 30 days',
      });

      // In production, redirect to logout
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (error) {
      console.error('Deletion failed:', error);
      toast.error('Deletion failed', {
        description: 'Unable to process deletion request. Please contact support.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConsent = async () => {
    setLoading(true);
    try {
      await fetch('/api/users/current/consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gdprConsent),
      });

      // Update localStorage
      localStorage.setItem('ai-affiliate-cookie-preferences', JSON.stringify({
        essential: true,
        ...gdprConsent,
      }));

      toast.success('Consent preferences updated', {
        description: 'Your privacy settings have been saved',
      });
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Update failed', {
        description: 'Unable to save preferences. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFtcSettings = async () => {
    setLoading(true);
    try {
      // In production, save to backend
      localStorage.setItem('ftc-disclosure-enabled', String(ftcDisclosure));

      toast.success('FTC settings updated', {
        description: 'Your disclosure preferences have been saved',
      });
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Update failed', {
        description: 'Unable to save FTC settings. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-4xl">
        <div className="space-y-6">
          {/* FTC Disclosure Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  FTC Disclosure Settings
                </CardTitle>
                <CardDescription>
                  Configure affiliate disclosure for all generated content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="ftc-disclosure" className="text-base font-medium">
                      Enable FTC Disclosure
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically add affiliate disclaimers to all content
                    </p>
                  </div>
                  <Switch
                    id="ftc-disclosure"
                    checked={ftcDisclosure}
                    onCheckedChange={setFtcDisclosure}
                  />
                </div>

                {ftcDisclosure && (
                  <div className="p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-sm font-medium mb-2">Current Disclosure:</p>
                    <p className="text-sm text-muted-foreground italic">
                      "As an Amazon Associate, I earn from qualifying purchases. This means I may
                      receive a commission when you click on my affiliate links and make a purchase
                      at no additional cost to you."
                    </p>
                  </div>
                )}

                <Button onClick={handleSaveFtcSettings} disabled={loading} className="w-full">
                  Save FTC Settings
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* GDPR Consent Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-primary" />
                  Privacy & Consent
                </CardTitle>
                <CardDescription>
                  Manage your data processing and cookie preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Essential Cookies */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Essential Cookies</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Required for the website to function (Always enabled)
                    </p>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                {/* Functional */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Functional</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Remember your preferences and settings
                    </p>
                  </div>
                  <Switch
                    checked={gdprConsent.functional}
                    onCheckedChange={(checked) =>
                      setGdprConsent({ ...gdprConsent, functional: checked })
                    }
                  />
                </div>

                {/* Analytics */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Analytics</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Help us improve your experience
                    </p>
                  </div>
                  <Switch
                    checked={gdprConsent.analytics}
                    onCheckedChange={(checked) =>
                      setGdprConsent({ ...gdprConsent, analytics: checked })
                    }
                  />
                </div>

                {/* Marketing */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Marketing</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Personalized content recommendations
                    </p>
                  </div>
                  <Switch
                    checked={gdprConsent.marketing}
                    onCheckedChange={(checked) =>
                      setGdprConsent({ ...gdprConsent, marketing: checked })
                    }
                  />
                </div>

                {/* Advertising */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-base font-medium">Advertising</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Affiliate tracking and conversion attribution
                    </p>
                  </div>
                  <Switch
                    checked={gdprConsent.advertising}
                    onCheckedChange={(checked) =>
                      setGdprConsent({ ...gdprConsent, advertising: checked })
                    }
                  />
                </div>

                <Button onClick={handleSaveConsent} disabled={loading} className="w-full">
                  Save Privacy Preferences
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* GDPR Data Rights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Your Data Rights (GDPR)
                </CardTitle>
                <CardDescription>
                  Exercise your rights under GDPR and CCPA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Data */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">Export Your Data</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Download a copy of all your personal data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExportData}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>

                {/* Delete Data */}
                <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                  <div className="flex-1">
                    <h3 className="font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Delete Your Data
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Permanently delete your account and all data (irreversible)
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteData}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground pt-4 space-y-1">
                  <p>
                    <strong>Your Rights:</strong> Access, Rectification, Erasure, Restriction,
                    Portability, Objection
                  </p>
                  <p>
                    For more information, see our{' '}
                    <Link href="/privacy-policy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
