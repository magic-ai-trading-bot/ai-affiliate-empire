'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  FileText,
  TrendingUp,
  Monitor,
  FileCheck,
  LayoutGrid,
  LucideIcon
} from 'lucide-react';
import { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

// Icon mapping for categories
const categoryIcons: Record<string, LucideIcon> = {
  'ai-automation': Sparkles,
  'content-strategy': FileText,
  'revenue-growth': TrendingUp,
  'platform-optimization': Monitor,
  'case-studies': FileCheck,
  'all': LayoutGrid,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return categoryIcons[slug] || FileText;
}

interface CategoryNavProps {
  categories: Category[];
  showAll?: boolean;
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'grid';
}

export default function CategoryNav({
  categories,
  showAll = true,
  className,
  variant = 'horizontal'
}: CategoryNavProps) {
  const pathname = usePathname();

  const allCategories = showAll
    ? [
        { id: 'all', name: 'All Articles', slug: '/articles', count: categories.reduce((sum, cat) => sum + (cat.count || 0), 0) },
        ...categories,
      ]
    : categories;

  const isActive = (slug: string) => {
    if (slug === '/articles') {
      return pathname === '/articles' || pathname === '/';
    }
    return pathname.includes(`/category/${slug}`);
  };

  // Horizontal scrollable nav (default)
  if (variant === 'horizontal') {
    return (
      <nav className={cn('w-full', className)}>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {allCategories.map((category) => {
            const Icon = getCategoryIcon(category.slug);
            const active = isActive(category.slug);
            const href = category.slug.startsWith('/') ? category.slug : `/category/${category.slug}`;

            return (
              <Link
                key={category.id}
                href={href}
                className={cn(
                  'group flex shrink-0 items-center gap-2 rounded-full border-2 px-5 py-2.5 font-medium transition-all duration-300 hover:shadow-md',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-md'
                    : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent'
                )}
              >
                <Icon className={cn('h-4 w-4 transition-transform duration-300 group-hover:scale-110')} />
                <span className="whitespace-nowrap">{category.name}</span>
                {category.count !== undefined && (
                  <span
                    className={cn(
                      'ml-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {category.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // Vertical list nav
  if (variant === 'vertical') {
    return (
      <nav className={cn('w-full space-y-2', className)}>
        {allCategories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          const active = isActive(category.slug);
          const href = category.slug.startsWith('/') ? category.slug : `/category/${category.slug}`;

          return (
            <Link
              key={category.id}
              href={href}
              className={cn(
                'group flex items-center justify-between rounded-lg border-2 px-4 py-3 transition-all duration-300 hover:shadow-md',
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110',
                    active ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      'font-semibold transition-colors',
                      active ? 'text-primary' : 'text-foreground group-hover:text-primary'
                    )}
                  >
                    {category.name}
                  </span>
                  {category.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1">{category.description}</span>
                  )}
                </div>
              </div>
              {category.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-sm font-semibold',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {category.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Grid layout nav
  return (
    <nav className={cn('w-full', className)}>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {allCategories.map((category) => {
          const Icon = getCategoryIcon(category.slug);
          const active = isActive(category.slug);
          const href = category.slug.startsWith('/') ? category.slug : `/category/${category.slug}`;

          return (
            <Link
              key={category.id}
              href={href}
              className={cn(
                'group flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg',
                active
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110',
                  active ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                )}
              >
                <Icon className="h-8 w-8" />
              </div>
              <div className="flex flex-col items-center text-center">
                <h3
                  className={cn(
                    'font-bold transition-colors',
                    active ? 'text-primary' : 'text-foreground group-hover:text-primary'
                  )}
                >
                  {category.name}
                </h3>
                {category.count !== undefined && (
                  <span className="mt-1 text-sm text-muted-foreground">
                    {category.count} {category.count === 1 ? 'article' : 'articles'}
                  </span>
                )}
              </div>
              {active && (
                <div className="absolute -bottom-1 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
