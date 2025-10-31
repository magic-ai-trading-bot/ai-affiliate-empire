'use client';

import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import Button from './ui/Button';

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] w-full overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-4 top-20 h-72 w-72 animate-float rounded-full bg-primary/20 blur-3xl" />
        <div className="animation-delay-2000 absolute -right-4 top-40 h-96 w-96 animate-float rounded-full bg-accent/20 blur-3xl" />
        <div className="animation-delay-4000 absolute bottom-20 left-1/2 h-80 w-80 animate-float rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="container relative mx-auto flex min-h-[90vh] flex-col items-center justify-center px-4 py-20 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex animate-slide-up items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
          <Sparkles className="h-4 w-4" />
          <span>AI-Powered Affiliate Marketing Insights</span>
        </div>

        {/* Headline */}
        <h1 className="mb-6 animate-slide-up text-4xl font-black leading-tight text-foreground md:text-6xl lg:text-display animation-delay-200">
          Master Affiliate Marketing
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            with AI Automation
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mb-10 max-w-2xl animate-slide-up text-lg text-muted-foreground md:text-xl animation-delay-400">
          Discover cutting-edge strategies, AI-driven insights, and proven tactics to build a
          profitable affiliate empire that runs on autopilot.
        </p>

        {/* CTAs */}
        <div className="flex animate-slide-up flex-col gap-4 sm:flex-row animation-delay-600">
          <Button size="lg" icon={<TrendingUp className="h-5 w-5" />} iconPosition="left">
            Explore Articles
          </Button>
          <Button size="lg" variant="outline" icon={<ArrowRight className="h-5 w-5" />} iconPosition="right">
            Learn Our System
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid animate-scale-in grid-cols-1 gap-8 sm:grid-cols-3 animation-delay-800">
          <div className="flex flex-col items-center">
            <div className="mb-2 text-4xl font-black text-primary">50+</div>
            <div className="text-sm text-muted-foreground">In-Depth Articles</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-2 text-4xl font-black text-primary">$10K+</div>
            <div className="text-sm text-muted-foreground">Monthly Revenue Goal</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-2 text-4xl font-black text-primary">24/7</div>
            <div className="text-sm text-muted-foreground">Autonomous Operation</div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-sm">Scroll to explore</span>
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
