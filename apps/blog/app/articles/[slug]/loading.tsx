export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 space-y-4 animate-pulse">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="h-12 w-full bg-muted rounded"></div>
          <div className="h-6 w-3/4 bg-muted rounded"></div>
          <div className="flex gap-4">
            <div className="h-10 w-10 bg-muted rounded-full"></div>
            <div className="h-5 w-48 bg-muted rounded"></div>
          </div>
          <div className="h-80 w-full bg-muted rounded-lg"></div>
        </div>
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-3/4 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
}
