'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  TrendingDown,
  AlertCircle,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useOptimizations, applyOptimization, rejectOptimization } from '@/lib/cost-api';
import type { Recommendation } from '@/lib/cost-api';
import { formatCost, getImpactColor, getStatusBadgeColor } from '@/lib/cost-utils';
import { cn } from '@/lib/utils';

type SortBy = 'impact' | 'savings' | 'date';
type FilterBy = 'all' | 'pending' | 'applied' | 'rejected';

export default function OptimizationsPage() {
  const router = useRouter();
  const { data, mutate, isLoading } = useOptimizations(60000);
  const [sortBy, setSortBy] = useState<SortBy>('savings');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleApply = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const result = await applyOptimization(id);
      if (result.success) {
        toast.success(result.message || 'Optimization applied successfully');
        mutate(); // Refresh data
      } else {
        toast.error('Failed to apply optimization');
      }
    } catch (error) {
      console.error('Apply error:', error);
      toast.error(
        `Failed to apply: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleReject = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const result = await rejectOptimization(id);
      if (result.success) {
        toast.success(result.message || 'Optimization rejected');
        mutate(); // Refresh data
      } else {
        toast.error('Failed to reject optimization');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(
        `Failed to reject: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Filter and sort recommendations
  const recommendations = data?.recommendations || [];
  const filteredRecommendations = recommendations.filter((rec) => {
    if (filterBy === 'all') return true;
    return rec.status === filterBy;
  });

  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
    if (sortBy === 'impact') {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    }
    if (sortBy === 'savings') {
      return b.estimatedSavings - a.estimatedSavings;
    }
    if (sortBy === 'date') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cost Optimizations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated recommendations to reduce costs
          </p>
        </div>
        <Button onClick={() => router.push('/cost-monitoring')} variant="outline" size="sm">
          Back to Dashboard
        </Button>
      </div>

      {/* Total Saved Card */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingDown className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Saved This Month</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCost(data?.totalSaved || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium py-2">Filter:</span>
          {(['all', 'pending', 'applied', 'rejected'] as FilterBy[]).map((filter) => (
            <Button
              key={filter}
              variant={filterBy === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterBy(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border rounded-md bg-background text-sm"
          >
            <option value="savings">Savings (High to Low)</option>
            <option value="impact">Impact (High to Low)</option>
            <option value="date">Date (Newest First)</option>
          </select>
        </div>
      </div>

      {/* Recommendations List */}
      {sortedRecommendations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Optimized!</h3>
            <p className="text-muted-foreground">
              No {filterBy !== 'all' ? filterBy : ''} optimization recommendations at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedRecommendations.map((rec) => (
            <Card
              key={rec.id}
              className={cn(
                'transition-all hover:shadow-lg',
                rec.status === 'applied' && 'border-green-500/30',
                rec.status === 'rejected' && 'opacity-60'
              )}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Main Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold">{rec.title}</h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium border',
                            getImpactColor(rec.impact)
                          )}
                        >
                          {rec.impact.toUpperCase()} Impact
                        </span>
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium',
                            getStatusBadgeColor(rec.status)
                          )}
                        >
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">{rec.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          Save {formatCost(rec.estimatedSavings)}/month
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        Created: {new Date(rec.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {rec.status === 'pending' && (
                    <div className="flex lg:flex-col gap-3 lg:justify-center">
                      <Button
                        onClick={() => handleApply(rec.id)}
                        disabled={processingIds.has(rec.id)}
                        className="flex-1 lg:flex-none gap-2"
                        variant="default"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {processingIds.has(rec.id) ? 'Applying...' : 'Apply'}
                      </Button>
                      <Button
                        onClick={() => handleReject(rec.id)}
                        disabled={processingIds.has(rec.id)}
                        className="flex-1 lg:flex-none gap-2"
                        variant="outline"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {rec.status === 'applied' && (
                    <div className="flex items-center justify-center lg:w-32">
                      <div className="text-center">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          Applied
                        </span>
                      </div>
                    </div>
                  )}

                  {rec.status === 'rejected' && (
                    <div className="flex items-center justify-center lg:w-32">
                      <div className="text-center">
                        <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          Rejected
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
