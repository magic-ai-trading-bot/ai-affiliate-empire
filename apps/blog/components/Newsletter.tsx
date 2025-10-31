'use client';

import { useState } from 'react';
import { Mail, CheckCircle, Sparkles } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setLoading(false);
    setSuccess(true);
    setEmail('');

    // Reset success message after 5 seconds
    setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background py-20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Icon */}
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-8 w-8" />
          </div>

          {/* Headline */}
          <h2 className="mb-4 text-3xl font-black text-foreground md:text-4xl">
            Get Weekly AI Marketing Insights
          </h2>

          {/* Description */}
          <p className="mb-8 text-lg text-muted-foreground">
            Join 1,000+ marketers receiving exclusive strategies, case studies, and automation tips
            every week.
          </p>

          {/* Benefits */}
          <div className="mb-8 grid gap-4 text-left sm:grid-cols-3">
            {[
              'AI automation guides',
              'Revenue optimization tips',
              'Exclusive case studies',
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          {success ? (
            <div className="animate-scale-in rounded-2xl border-2 border-primary bg-primary/5 p-6">
              <div className="flex items-center justify-center gap-3 text-primary">
                <CheckCircle className="h-6 w-6" />
                <p className="font-semibold">Successfully subscribed! Check your email.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
                icon={<Mail className="h-5 w-5" />}
                iconPosition="left"
              />
              <Button type="submit" size="lg" loading={loading} className="sm:w-auto">
                Subscribe
              </Button>
            </form>
          )}

          {/* Privacy Note */}
          <p className="mt-4 text-xs text-muted-foreground">
            We respect your privacy. Unsubscribe at any time.{' '}
            <a href="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
