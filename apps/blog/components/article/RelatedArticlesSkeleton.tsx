import { Card } from '../ui/Card';

interface RelatedArticlesSkeletonProps {
  count?: number;
}

export default function RelatedArticlesSkeleton({ count = 3 }: RelatedArticlesSkeletonProps) {
  return (
    <section className="mt-16 mb-12" aria-label="Loading related articles">
      <div className="h-8 w-64 bg-muted animate-pulse rounded mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            {/* Image skeleton */}
            <div className="relative aspect-[16/9] bg-muted animate-pulse" />

            {/* Content skeleton */}
            <div className="p-6 space-y-3">
              {/* Category badge */}
              <div className="h-6 w-24 bg-muted animate-pulse rounded" />

              {/* Title */}
              <div className="space-y-2">
                <div className="h-5 bg-muted animate-pulse rounded w-full" />
                <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
              </div>

              {/* Excerpt */}
              <div className="space-y-2 pt-2">
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-4 pt-3">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-muted animate-pulse rounded w-32" />
                  <div className="h-3 bg-muted animate-pulse rounded w-24" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
