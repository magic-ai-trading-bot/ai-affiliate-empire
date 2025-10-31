'use client';

import { useState, useEffect } from 'react';
import CookieConsent from 'react-cookie-consent';
import { Cookie, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
}

const COOKIE_NAME = 'ai-affiliate-cookie-consent';
const COOKIE_PREFERENCES_NAME = 'ai-affiliate-cookie-preferences';

export function CookieConsentBanner() {
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true, cannot be disabled
    functional: false,
    analytics: false,
    advertising: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Load saved preferences from localStorage
    const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_NAME);
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (e) {
        console.error('Failed to parse cookie preferences:', e);
      }
    }

    // Listen for cookie settings trigger from footer
    const handleOpenSettings = () => setShowSettings(true);
    window.addEventListener('openCookieSettings', handleOpenSettings);

    return () => {
      window.removeEventListener('openCookieSettings', handleOpenSettings);
    };
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_PREFERENCES_NAME, JSON.stringify(prefs));
    setPreferences(prefs);

    // Apply cookie preferences (in production, this would interact with analytics services)
    if (typeof window !== 'undefined') {
      // Google Analytics
      if (prefs.analytics) {
        // Enable GA
        console.log('Analytics cookies enabled');
      } else {
        // Disable GA
        console.log('Analytics cookies disabled');
      }

      // Advertising cookies
      if (prefs.advertising) {
        console.log('Advertising cookies enabled');
      } else {
        console.log('Advertising cookies disabled');
      }
    }
  };

  const handleAcceptAll = () => {
    const allEnabled: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      advertising: true,
    };
    savePreferences(allEnabled);
    setShowSettings(false);
  };

  const handleRejectNonEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      advertising: false,
    };
    savePreferences(essentialOnly);
    setShowSettings(false);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
    setShowSettings(false);
  };

  if (!mounted) return null;

  return (
    <>
      <CookieConsent
        location="bottom"
        cookieName={COOKIE_NAME}
        expires={365}
        overlay={false}
        containerClasses="cookie-consent-container"
        contentClasses="cookie-consent-content"
        style={{
          background: 'hsl(var(--card))',
          borderTop: '1px solid hsl(var(--border))',
          padding: '1rem',
          alignItems: 'center',
          boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
        contentStyle={{
          flex: '1 0 300px',
          margin: '0.5rem 1rem',
          color: 'hsl(var(--foreground))',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        enableDeclineButton
        declineButtonText="Reject Non-Essential"
        buttonText="Accept All"
        declineButtonStyle={{
          background: 'hsl(var(--secondary))',
          color: 'hsl(var(--secondary-foreground))',
          fontSize: '0.875rem',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer',
          fontWeight: '500',
        }}
        buttonStyle={{
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          fontSize: '0.875rem',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer',
          fontWeight: '500',
        }}
        onAccept={handleAcceptAll}
        onDecline={handleRejectNonEssential}
      >
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium mb-1">We use cookies</p>
            <p className="text-muted-foreground">
              We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.{' '}
              <Link href="/cookie-policy" className="text-primary hover:underline">
                Learn more
              </Link>
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="text-sm text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
          style={{ margin: '0.5rem 0' }}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Customize
        </button>
      </CookieConsent>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Essential cookies are always enabled to ensure the site functions properly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="essential" className="text-base font-medium">
                  Essential Cookies
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Required for the website to function. Cannot be disabled.
                </p>
              </div>
              <Switch
                id="essential"
                checked={true}
                disabled
                aria-label="Essential cookies (always enabled)"
              />
            </div>

            {/* Functional Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="functional" className="text-base font-medium">
                  Functional Cookies
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Remember your preferences and settings.
                </p>
              </div>
              <Switch
                id="functional"
                checked={preferences.functional}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, functional: checked })
                }
                aria-label="Functional cookies"
              />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="analytics" className="text-base font-medium">
                  Analytics Cookies
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Help us understand how you use the site to improve user experience.
                </p>
              </div>
              <Switch
                id="analytics"
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
                aria-label="Analytics cookies"
              />
            </div>

            {/* Advertising Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="advertising" className="text-base font-medium">
                  Advertising Cookies
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Used for affiliate tracking and conversion attribution.
                </p>
              </div>
              <Switch
                id="advertising"
                checked={preferences.advertising}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, advertising: checked })
                }
                aria-label="Advertising cookies"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleRejectNonEssential}
              className="sm:flex-1"
            >
              Reject Non-Essential
            </Button>
            <Button
              variant="secondary"
              onClick={handleSavePreferences}
              className="sm:flex-1"
            >
              Save Preferences
            </Button>
            <Button
              onClick={handleAcceptAll}
              className="sm:flex-1"
            >
              Accept All
            </Button>
          </DialogFooter>

          <div className="text-xs text-muted-foreground text-center pt-2">
            <Link href="/cookie-policy" className="hover:text-primary">
              Learn more about our cookie policy
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
