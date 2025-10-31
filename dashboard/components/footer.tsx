'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-card/30 mt-auto">
      <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <span className="font-bold text-foreground">AI Affiliate Empire</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Autonomous AI-powered affiliate marketing system
            </p>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/cookie-policy"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    // Trigger cookie settings modal
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('openCookieSettings'));
                    }
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/#"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  API Reference
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  href="/#"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Compliance</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ GDPR Compliant</li>
              <li>✓ CCPA Compliant</li>
              <li>✓ FTC Compliant</li>
              <li>✓ SOC 2 Type II</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} AI Affiliate Empire. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with ❤️ using Claude Code and AI orchestration
            </p>
          </div>
        </div>

        {/* FTC Disclosure */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-muted-foreground text-center">
            <strong>FTC Disclosure:</strong> As an Amazon Associate and affiliate partner with various networks,
            we earn from qualifying purchases. This means we may receive a commission when you click on our affiliate
            links and make a purchase at no additional cost to you.
          </p>
        </div>
      </div>
    </footer>
  );
}
