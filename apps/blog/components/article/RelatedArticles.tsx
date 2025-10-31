'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import { Article } from '@/lib/types';
import { fetchRelatedArticles, trackRelatedArticleClick } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { getBlurDataURL } from '@/lib/imageUtils';
import Badge from '../ui/Badge';
import { Card } from '../ui/Card';
import RelatedArticlesSkeleton from './RelatedArticlesSkeleton';

interface RelatedArticlesProps {
  articleSlug: string;
  minArticles?: number;
  maxArticles?: number;
}

export default function RelatedArticles({
  articleSlug,
  minArticles = 3,
  maxArticles = 6,
}: RelatedArticlesProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRelatedArticles() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRelatedArticles(articleSlug, maxArticles);
        setArticles(data);
      } catch (err) {
        console.error('Failed to load related articles:', err);
        setError('Failed to load related articles');
      } finally {
        setLoading(false);
      }
    }

    loadRelatedArticles();
  }, [articleSlug, maxArticles]);

  const handleArticleClick = (relatedSlug: string, position: number) => {
    trackRelatedArticleClick(articleSlug, relatedSlug, position);
  };

  // Show loading skeleton
  if (loading) {
    return <RelatedArticlesSkeleton count={minArticles} />;
  }

  // Don't show section if no articles or minimum not met
  if (!articles || articles.length < minArticles) {
    return null;
  }

  return (
    <section className="mt-16 mb-12" aria-label="Related articles">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">You Might Also Like</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article, index) => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            onClick={() => handleArticleClick(article.slug, index)}
          >
            <Card
              variant="interactive"
              className="group overflow-hidden h-full flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  placeholder="blur"
                  blurDataURL={getBlurDataURL(800, 450)}
                  loading="lazy"
                />
                {/* Category Badge Overlay */}
                <div className="absolute left-4 top-4">
                  <Badge
                    variant="primary"
                    className="bg-primary/90 backdrop-blur-sm"
                  >
                    {article.category.name}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-6">
                {/* Title */}
                <h3 className="mb-3 text-lg font-bold leading-tight text-foreground transition-colors group-hover:text-primary line-clamp-2">
                  {article.title}
                </h3>

                {/* Excerpt */}
                <p className="mb-4 text-sm text-muted-foreground line-clamp-3 flex-1">
                  {article.excerpt}
                </p>

                {/* Meta Info */}
                <div className="mt-auto flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <Image
                      src={article.author.avatar}
                      alt={article.author.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                      placeholder="blur"
                      blurDataURL={getBlurDataURL(24, 24)}
                      loading="lazy"
                    />
                    <span className="font-medium text-foreground">
                      {article.author.name}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(article.publishedAt)}</span>
                  </div>

                  {/* Read Time */}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{article.readTime} min</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
