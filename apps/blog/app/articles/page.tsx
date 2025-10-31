'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Pagination from '@/components/Pagination';
import { ArticlesResponse, Article } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ITEMS_PER_PAGE = 10;

export default function ArticlesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [articles, setArticles] = useState<Article[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles(currentPage);
  }, [currentPage]);

  const fetchArticles = async (page: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/content/blog?page=${page}&limit=${ITEMS_PER_PAGE}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ArticlesResponse = await response.json();
      setArticles(data.data);
      setTotalItems(data.meta.totalItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
      console.error('Error fetching articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    router.push(`/articles?page=${page}`, { scroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            All Articles
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Browse our comprehensive collection of product reviews and guides
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-800 dark:text-red-200 font-medium">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden animate-pulse"
              >
                <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Empty State */}
            {articles.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No articles found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Check back soon for new content!
                </p>
              </div>
            ) : (
              <>
                {/* Articles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {articles.map((article) => (
                    <article
                      key={article.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* Article Image */}
                      <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 relative">
                        {article.product?.imageUrl ? (
                          <img
                            src={article.product.imageUrl}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              className="w-16 h-16 text-white opacity-50"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                        {article.product?.category && (
                          <span className="absolute top-2 left-2 px-3 py-1 bg-white/90 dark:bg-gray-800/90 text-xs font-medium rounded-full text-gray-700 dark:text-gray-300">
                            {article.product.category}
                          </span>
                        )}
                      </div>

                      {/* Article Content */}
                      <div className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {article.title}
                        </h2>
                        {article.excerpt && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(article.createdAt || article.publishedAt).toLocaleDateString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </span>
                          <a
                            href={`/articles/${article.slug}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                          >
                            Read More →
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={handlePageChange}
                  isLoading={isLoading}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Keyboard Navigation Hint */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-500 mr-2 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Keyboard shortcuts:</strong> Use{' '}
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 rounded text-xs">
                ←
              </kbd>{' '}
              and{' '}
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 rounded text-xs">
                →
              </kbd>{' '}
              arrow keys to navigate pages,{' '}
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 rounded text-xs">
                Home
              </kbd>{' '}
              for first page,{' '}
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 rounded text-xs">
                End
              </kbd>{' '}
              for last page.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
