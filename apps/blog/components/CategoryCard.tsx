'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  category: Category;
  icon: LucideIcon;
  active?: boolean;
}

export default function CategoryCard({ category, icon: Icon, active = false }: CategoryCardProps) {
  return (
    <Link href={`/category/${category.slug}`}>
      <div
        className={cn(
          'group relative flex min-w-[180px] flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg',
          active
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-border bg-card hover:border-primary/50'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110',
            active ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
          )}
        >
          <Icon className="h-8 w-8" />
        </div>

        {/* Category Name */}
        <h3
          className={cn(
            'text-center font-bold transition-colors',
            active ? 'text-primary' : 'text-foreground group-hover:text-primary'
          )}
        >
          {category.name}
        </h3>

        {/* Article Count */}
        {category.count !== undefined && (
          <span className="text-sm text-muted-foreground">
            {category.count} {category.count === 1 ? 'article' : 'articles'}
          </span>
        )}

        {/* Active Indicator */}
        {active && (
          <div className="absolute -bottom-1 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-primary" />
        )}
      </div>
    </Link>
  );
}
