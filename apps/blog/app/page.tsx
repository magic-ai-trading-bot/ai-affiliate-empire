'use client';

import dynamic from 'next/dynamic';
import { Bot, Sparkles, TrendingUp, Zap, Video, BarChart } from 'lucide-react';
import { getFeaturedArticles, getLatestArticles, mockCategories } from '@/lib/mockData';

// Dynamic imports for code splitting
const Hero = dynamic(() => import('@/components/Hero'), {
  loading: () => <div className="min-h-[90vh] bg-gradient-to-br from-primary/10 via-background to-accent/10 animate-pulse" />,
});

const ArticleCard = dynamic(() => import('@/components/ArticleCard'), {
  loading: () => <div className="h-[400px] bg-muted animate-pulse rounded-lg" />,
});

const CategoryCard = dynamic(() => import('@/components/CategoryCard'), {
  loading: () => <div className="h-[120px] bg-muted animate-pulse rounded-lg" />,
});

const Newsletter = dynamic(() => import('@/components/Newsletter'), {
  loading: () => <div className="h-[300px] bg-accent/5 animate-pulse" />,
  ssr: false,
});

const categoryIcons = {
  'ai-automation': Bot,
  'content-strategy': Sparkles,
  'revenue-growth': TrendingUp,
  'platform-optimization': Video,
  'case-studies': BarChart,
};

// Enable ISR - revalidate every 60 seconds
export const revalidate = 60;

export default function Home() {
  const featuredArticles = getFeaturedArticles();
  const latestArticles = getLatestArticles(6);

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <Hero />

      {/* Categories Section */}
      <section className="border-t border-border bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
              <Zap className="h-4 w-4" />
              <span>Explore Topics</span>
            </div>
            <h2 className="text-3xl font-black text-foreground md:text-4xl">Browse by Category</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Deep dive into specific areas of affiliate marketing mastery
            </p>
          </div>

          {/* Categories Grid - Horizontal Scroll on Mobile */}
          <div className="relative">
            <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:gap-6 lg:grid-cols-5">
              {mockCategories.map((category, index) => {
                const Icon = categoryIcons[category.slug as keyof typeof categoryIcons] || Bot;
                return (
                  <div
                    key={category.id}
                    className="animate-slide-in-left"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CategoryCard category={category} icon={Icon} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Articles Section */}
      <section className="bg-accent/5 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <TrendingUp className="h-4 w-4" />
              <span>Featured</span>
            </div>
            <h2 className="text-3xl font-black text-foreground md:text-4xl">
              Must-Read Articles
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Our most impactful content, handpicked for you
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article, index) => (
              <div
                key={article.id}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <ArticleCard article={article} variant={index === 0 ? 'featured' : 'standard'} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Articles Section */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Latest</span>
              </div>
              <h2 className="text-3xl font-black text-foreground md:text-4xl">
                Recent Articles
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Stay updated with our freshest insights
              </p>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {latestArticles.slice(0, 6).map((article, index) => (
              <div
                key={article.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ArticleCard article={article} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <Newsletter />

      {/* Footer CTA */}
      <section className="border-t border-border bg-background py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Built with ❤️ by AI Affiliate Empire • © 2025 All rights reserved
          </p>
        </div>
      </section>

      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
        .animation-delay-600 {
          animation-delay: 600ms;
        }
        .animation-delay-800 {
          animation-delay: 800ms;
        }
        .animation-delay-2000 {
          animation-delay: 2000ms;
        }
        .animation-delay-4000 {
          animation-delay: 4000ms;
        }
      `}</style>
    </main>
  );
}
