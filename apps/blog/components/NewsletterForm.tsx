'use client';

import { useState, FormEvent } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface NewsletterFormProps {
  variant?: 'inline' | 'featured';
  className?: string;
}

type FormState = 'idle' | 'loading' | 'success' | 'error';

export function NewsletterForm({ variant = 'inline', className = '' }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Reset state
    setState('loading');
    setMessage('');

    // Validate email
    if (!email.trim()) {
      setState('error');
      setMessage('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setState('error');
      setMessage('Please enter a valid email address');
      return;
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/blog/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to subscribe');
      }

      setState('success');
      setMessage(data.message || 'Success! Check your email to confirm your subscription.');
      setEmail('');

      // Reset after 5 seconds
      setTimeout(() => {
        setState('idle');
        setMessage('');
      }, 5000);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');

      // Reset error after 5 seconds
      setTimeout(() => {
        setState('idle');
        setMessage('');
      }, 5000);
    }
  };

  const isInline = variant === 'inline';

  return (
    <div className={`${className}`}>
      <div className={`${isInline ? 'bg-muted/50 rounded-lg p-6' : 'bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 rounded-2xl p-8 border border-border/50'}`}>
        {/* Header */}
        <div className={`${isInline ? 'mb-4' : 'mb-6 text-center'}`}>
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3 ${isInline ? '' : 'mx-auto'}`}>
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h3 className={`${isInline ? 'text-lg' : 'text-2xl'} font-bold mb-2`}>
            {isInline ? 'Stay Updated' : 'Join Our Newsletter'}
          </h3>
          <p className={`text-muted-foreground ${isInline ? 'text-sm' : 'text-base'}`}>
            {isInline
              ? 'Get the latest insights delivered to your inbox.'
              : 'Discover AI-powered strategies, exclusive tips, and curated product recommendations to maximize your affiliate earnings.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={state === 'loading' || state === 'success'}
              className={`w-full px-4 py-3 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                state === 'error' ? 'border-destructive' : 'border-input'
              }`}
              aria-label="Email address"
              aria-invalid={state === 'error'}
              aria-describedby={message ? 'newsletter-message' : undefined}
            />
          </div>

          <button
            type="submit"
            disabled={state === 'loading' || state === 'success'}
            className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              state === 'success'
                ? 'bg-success text-success-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]'
            }`}
          >
            {state === 'loading' && (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Subscribing...</span>
              </>
            )}
            {state === 'success' && (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Subscribed!</span>
              </>
            )}
            {(state === 'idle' || state === 'error') && (
              <>
                <Mail className="w-5 h-5" />
                <span>Subscribe Now</span>
              </>
            )}
          </button>

          {/* Message Display */}
          {message && (
            <div
              id="newsletter-message"
              role="alert"
              className={`flex items-start gap-2 p-3 rounded-lg text-sm animate-slide-up ${
                state === 'success'
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {state === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <p>{message}</p>
            </div>
          )}
        </form>

        {/* Privacy Notice */}
        <p className="text-xs text-muted-foreground mt-4 text-center">
          By subscribing, you agree to our{' '}
          <a href="/privacy-policy" className="underline hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          . Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
