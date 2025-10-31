'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-8', className)}>
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        {/* Home Link */}
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            aria-label="Go to home page"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Home</span>
          </Link>
        </li>

        {/* Breadcrumb Items */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'truncate',
                    isLast ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
