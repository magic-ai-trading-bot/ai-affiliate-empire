'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import { Filter, SortAsc, Loader2, AlertCircle } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  metaDescription: string | null;
  keywords: string | null;
  publishedAt: string | null;
  product: {
    id: string;
    title: string;
    category: string | null;
    imageUrl: string | null;
  };
  relevanceScore?: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  query: string;
  suggestions?: string[];
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular'>('relevance');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Perform search when query or filters change
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, currentPage, selectedCategory, sortBy);
    }
  }, [initialQuery, currentPage, selectedCategory, sortBy]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/content/blog/categories`
      );
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const performSearch = async (
    query: string,
    page: number = 1,
    category: string = '',
    sort: string = 'relevance'
  ) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: '10',
        sortBy: sort,
      });

      if (category) {
        params.append('category', category);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/content/blog/search?${params}`
      );

      if (!res.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse = await res.json();
      setSearchResults(data);
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setCurrentPage(1);
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(query)}`);
    performSearch(query, 1, selectedCategory, sortBy);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: 'relevance' | 'recent' | 'popular') => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const highlightText = (text: string, query: string): string => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  const truncateContent = (content: string, maxLength: number = 300): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Blog Search
          </h1>
          <SearchBar initialQuery={initialQuery} onSearch={handleSearch} />
        </div>

        {/* Filters and Sort */}
        {initialQuery && (
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category:
                </span>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort by:
                </span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Results Count */}
        {searchResults && !isLoading && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Found {searchResults.total} result{searchResults.total !== 1 ? 's' : ''} for "
            <span className="font-semibold text-gray-900 dark:text-white">
              {searchResults.query}
            </span>
            "
          </div>
        )}

        {/* Search Results */}
        {searchResults && !isLoading && searchResults.results.length > 0 && (
          <div className="space-y-6">
            {searchResults.results.map((result) => (
              <article
                key={result.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200
                         dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {result.product.imageUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={result.product.imageUrl}
                        alt={result.product.title}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {result.product.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
                                       font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800
                                       dark:text-blue-300">
                          {result.product.category}
                        </span>
                      )}
                      {result.relevanceScore !== undefined && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Score: {result.relevanceScore}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      <a
                        href={`/blog/${result.slug}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        dangerouslySetInnerHTML={{
                          __html: highlightText(result.title, searchResults.query),
                        }}
                      />
                    </h2>

                    <p
                      className="text-sm text-gray-600 dark:text-gray-400 mb-3"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(
                          result.excerpt ||
                            result.metaDescription ||
                            truncateContent(result.content),
                          searchResults.query
                        ),
                      }}
                    />

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {result.publishedAt && (
                        <span>
                          Published:{' '}
                          {new Date(result.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                      {result.keywords && (
                        <span>Tags: {result.keywords.split(',').slice(0, 3).join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* No Results */}
        {searchResults && !isLoading && searchResults.results.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try different keywords or remove filters
            </p>
            {searchResults.suggestions && searchResults.suggestions.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Try searching for:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {searchResults.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearch(suggestion)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700
                               dark:text-gray-300 rounded-full text-sm hover:bg-gray-200
                               dark:hover:bg-gray-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {searchResults && !isLoading && searchResults.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {searchResults.totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!searchResults.hasMore}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Empty State (no query yet) */}
        {!initialQuery && !isLoading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Start searching
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Enter a search term to find blog articles
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
