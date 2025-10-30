import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 skeleton" />
        <div className="h-4 w-4 skeleton rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 skeleton mb-2" />
        <div className="h-3 w-40 skeleton" />
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <div className="h-6 w-32 skeleton" />
      </CardHeader>
      <CardContent className="pl-2">
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-end gap-2 h-12">
              <div className="skeleton flex-1" style={{ height: `${Math.random() * 100}%` }} />
              <div className="skeleton flex-1" style={{ height: `${Math.random() * 100}%` }} />
              <div className="skeleton flex-1" style={{ height: `${Math.random() * 100}%` }} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TopProductsSkeleton() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <div className="h-6 w-40 skeleton" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full skeleton" />
                <div className="h-3 w-3/4 skeleton" />
              </div>
              <div className="h-8 w-16 skeleton" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex-col md:flex">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <div className="h-8 w-48 skeleton" />
          <div className="ml-auto flex items-center space-x-4">
            <div className="h-10 w-10 skeleton rounded-md" />
            <div className="h-10 w-32 skeleton rounded-md" />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <ChartSkeleton />
          <TopProductsSkeleton />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 skeleton" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full skeleton" />
                  <div className="h-4 w-3/4 skeleton" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
