'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type ConfirmState = 'loading' | 'success' | 'error';

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<ConfirmState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Invalid confirmation link. Please check your email for the correct link.');
      return;
    }

    const confirmSubscription = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/blog/newsletter/confirm?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setState('success');
          setMessage(data.message || 'Your subscription has been confirmed!');
        } else {
          setState('error');
          setMessage(data.message || 'Failed to confirm subscription. The link may have expired.');
        }
      } catch (error) {
        setState('error');
        setMessage('An error occurred. Please try again later.');
      }
    };

    confirmSubscription();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-md w-full bg-background border border-border/50 rounded-2xl shadow-xl p-8">
        {/* Loading State */}
        {state === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Confirming Subscription</h1>
            <p className="text-muted-foreground">Please wait while we confirm your subscription...</p>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Subscription Confirmed!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm">
                You will now receive our newsletter with exclusive AI strategies, product recommendations, and
                insider tips.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Confirmation Failed</h1>
            <p className="text-muted-foreground mb-6">{message}</p>

            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Go to Homepage
              </Link>

              <p className="text-sm text-muted-foreground">
                Need help?{' '}
                <a href="mailto:support@example.com" className="underline hover:text-foreground">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
