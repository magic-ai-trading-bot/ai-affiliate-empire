'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProviderName, formatCost, formatDateTime } from '@/lib/cost-utils';
import type { CostEntry } from '@/lib/cost-api';
import { cn } from '@/lib/utils';

interface CostEntriesTableProps {
  entries: CostEntry[];
  loading?: boolean;
  className?: string;
}

type SortField = 'timestamp' | 'provider' | 'cost';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export function CostEntriesTable({ entries, loading = false, className }: CostEntriesTableProps) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Get unique providers for filter
  const providers = useMemo(() => {
    const uniqueProviders = Array.from(new Set(entries.map((e) => e.provider)));
    return uniqueProviders.sort();
  }, [entries]);

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let result = [...entries];

    // Filter by provider
    if (filterProvider !== 'all') {
      result = result.filter((e) => e.provider === filterProvider);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortField === 'provider') {
        comparison = a.provider.localeCompare(b.provider);
      } else if (sortField === 'cost') {
        comparison = a.cost - b.cost;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [entries, filterProvider, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = filteredAndSortedEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (provider: string) => {
    setFilterProvider(provider);
    setCurrentPage(1); // Reset to first page
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Recent Cost Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-12 flex-1 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Recent Cost Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>No cost entries found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-lg">Recent Cost Entries</CardTitle>

          {/* Provider Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter:</label>
            <select
              value={filterProvider}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="px-3 py-1 border rounded-md bg-background text-sm"
            >
              <option value="all">All Providers</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {getProviderName(provider)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('timestamp')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Timestamp
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('provider')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Provider
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">Service</th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('cost')}
                    className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors"
                  >
                    Cost
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="text-right py-3 px-4">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm">{formatDateTime(entry.timestamp)}</td>
                  <td className="py-3 px-4 text-sm font-medium">
                    {getProviderName(entry.provider)}
                  </td>
                  <td className="py-3 px-4 text-sm">{entry.service}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-right">
                    {formatCost(entry.cost)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-muted-foreground">
                    {entry.tokens ? entry.tokens.toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {paginatedEntries.map((entry) => (
            <div
              key={entry.id}
              className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{getProviderName(entry.provider)}</p>
                  <p className="text-sm text-muted-foreground">{entry.service}</p>
                </div>
                <p className="text-lg font-bold">{formatCost(entry.cost)}</p>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatDateTime(entry.timestamp)}</span>
                {entry.tokens && <span>{entry.tokens.toLocaleString()} tokens</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedEntries.length)} of{' '}
              {filteredAndSortedEntries.length} entries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-3 text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
