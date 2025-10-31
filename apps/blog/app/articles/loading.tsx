import LoadingSpinner from '@/components/LoadingSpinner';

export default function ArticlesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8 h-12 w-48 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[400px] bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
