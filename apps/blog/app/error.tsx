'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);

    // Send to error tracking
    fetch('/api/analytics/error', {
      method: 'POST',
      body: JSON.stringify({
        error: error.toString(),
        digest: error.digest,
        url: window.location.href,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8 max-w-md text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong!
        </h1>
        <p className="text-muted-foreground mb-6">
          We apologize for the inconvenience. An unexpected error has occurred.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
