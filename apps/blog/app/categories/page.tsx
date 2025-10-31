import { Metadata } from 'next';
import { mockCategories } from '@/lib/mockData';
import CategoriesClient from '@/components/CategoriesClient';
import { SITE_CONFIG } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse our content categories to find expert insights on AI automation, content strategy, revenue growth, and platform optimization.',
  keywords: [...SITE_CONFIG.keywords, 'categories', 'topics', 'content categories'],
  openGraph: {
    title: 'Categories - AI Affiliate Empire Blog',
    description: 'Browse our content categories to find expert insights on AI automation, content strategy, revenue growth, and platform optimization.',
    url: `${SITE_CONFIG.url}/categories`,
    siteName: SITE_CONFIG.name,
    images: [
      {
        url: SITE_CONFIG.ogImage,
        width: 1200,
        height: 630,
        alt: 'AI Affiliate Empire Categories',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Categories - AI Affiliate Empire Blog',
    description: 'Browse our content categories to find expert insights on AI automation, content strategy, revenue growth, and platform optimization.',
    images: [SITE_CONFIG.ogImage],
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/categories`,
  },
};

export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-background py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Browse by Category
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Explore our comprehensive content library organized by topic. Find expert insights, strategies, and actionable advice tailored to your interests.
          </p>
        </header>

        <CategoriesClient categories={mockCategories} />
      </div>
    </main>
  );
}
