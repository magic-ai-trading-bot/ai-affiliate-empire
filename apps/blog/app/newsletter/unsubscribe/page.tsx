'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2, HeartCrack } from 'lucide-react';
import Link from 'next/link';

type UnsubscribeState = 'loading' | 'success' | 'error';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<UnsubscribeState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Invalid unsubscribe link. Please check your email for the correct link.');
      return;
    }

    const unsubscribe = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3000';
        const response = await fetch(`${backendUrl}/blog/newsletter/unsubscribe?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setState('success');
          setMessage(data.message || 'You have been unsubscribed successfully.');
        } else {
          setState('error');
          setMessage(data.message || 'Failed to unsubscribe. Please try again later.');
        }
      } catch (error) {
        setState('error');
        setMessage('An error occurred. Please try again later.');
      }
    };

    unsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <div className="max-w-md w-full bg-background border border-border/50 rounded-2xl shadow-xl p-8">
        {/* Loading State */}
        {state === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Processing Unsubscribe</h1>
            <p className="text-muted-foreground">Please wait...</p>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <HeartCrack className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Unsubscribed Successfully</h1>
            <p className="text-muted-foreground mb-6">{message}</p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm mb-3">We are sorry to see you go. You will no longer receive our newsletter.</p>
              <p className="text-sm font-semibold">Changed your mind?</p>
              <p className="text-sm text-muted-foreground">You can resubscribe anytime from our homepage.</p>
            </div>

            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Unsubscribe Failed</h1>
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
