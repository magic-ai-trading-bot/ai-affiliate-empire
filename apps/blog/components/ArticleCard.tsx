'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';
import { Card } from './ui/Card';
import Badge from './ui/Badge';
import { Article } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { getBlurDataURL } from '@/lib/imageUtils';

interface ArticleCardProps {
  article: Article;
  variant?: 'featured' | 'standard' | 'minimal';
}

export default function ArticleCard({ article, variant = 'standard' }: ArticleCardProps) {
  const isFeatured = variant === 'featured';

  return (
    <Link href={`/articles/${article.slug}`}>
      <Card
        variant="interactive"
        className={`group overflow-hidden ${isFeatured ? 'md:flex md:flex-row' : ''}`}
      >
        {/* Image */}
        <div
          className={`relative overflow-hidden bg-muted ${
            isFeatured ? 'md:w-1/2' : 'aspect-[16/9]'
          }`}
        >
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes={isFeatured ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
            placeholder="blur"
            blurDataURL={getBlurDataURL(800, 450)}
            loading={isFeatured ? 'eager' : 'lazy'}
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
        <div className={`flex flex-col p-6 ${isFeatured ? 'md:w-1/2 md:justify-center' : ''}`}>
          {/* Title */}
          <h3
            className={`mb-3 font-bold leading-tight text-foreground transition-colors group-hover:text-primary ${
              isFeatured ? 'text-2xl md:text-3xl' : 'text-xl'
            }`}
          >
            {article.title}
          </h3>

          {/* Excerpt */}
          <p
            className={`mb-4 text-muted-foreground ${
              isFeatured ? 'text-base' : 'line-clamp-2 text-sm'
            }`}
          >
            {article.excerpt}
          </p>

          {/* Meta Info */}
          <div className="mt-auto flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {/* Author */}
            <div className="flex items-center gap-2">
              <Image
                src={article.author.avatar}
                alt={article.author.name}
                width={32}
                height={32}
                className="rounded-full"
                placeholder="blur"
                blurDataURL={getBlurDataURL(32, 32)}
                loading="lazy"
              />
              <span className="font-medium text-foreground">{article.author.name}</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(article.publishedAt)}</span>
            </div>

            {/* Read Time */}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{article.readTime} min read</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
