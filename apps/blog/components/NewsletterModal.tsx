'use client';

import { useState, useEffect, FormEvent } from 'react';
import { X, Mail, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';

type FormState = 'idle' | 'loading' | 'success' | 'error';

const LOCAL_STORAGE_KEY = 'newsletter_modal_dismissed';
const MODAL_DELAY_MS = 3000; // Show modal after 3 seconds

export function NewsletterModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if user has already dismissed or subscribed
    const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (dismissed) return;

    // Show modal after delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Remember that user dismissed the modal (expires in 30 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    localStorage.setItem(LOCAL_STORAGE_KEY, expiryDate.toISOString());
  };

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

      // Close modal after success and mark as dismissed
      setTimeout(() => {
        handleClose();
      }, 3000);
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-modal-title"
      >
        <div
          className="relative bg-background rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto animate-scale-in border border-border/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-8">
            {/* Header with Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 id="newsletter-modal-title" className="text-2xl font-bold mb-2">
                Don't Miss Out!
              </h2>
              <p className="text-muted-foreground">
                Join 10,000+ readers getting exclusive AI strategies, insider tips, and curated product
                recommendations delivered weekly.
              </p>
            </div>

            {/* Benefits List */}
            <div className="mb-6 space-y-3">
              {[
                'Exclusive AI-powered marketing strategies',
                'Early access to top-performing products',
                'Weekly insights from industry experts',
                'No spam, unsubscribe anytime',
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{benefit}</p>
                </div>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  disabled={state === 'loading' || state === 'success'}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    state === 'error' ? 'border-destructive' : 'border-input'
                  }`}
                  aria-label="Email address"
                  aria-invalid={state === 'error'}
                  aria-describedby={message ? 'modal-message' : undefined}
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
                    <Sparkles className="w-5 h-5" />
                    <span>Get Free Updates</span>
                  </>
                )}
              </button>

              {/* Message Display */}
              {message && (
                <div
                  id="modal-message"
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
              We respect your privacy. Read our{' '}
              <a href="/privacy-policy" className="underline hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              .
            </p>

            {/* No Thanks Button */}
            {state !== 'success' && (
              <button
                onClick={handleClose}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                No thanks, I'll miss out
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
