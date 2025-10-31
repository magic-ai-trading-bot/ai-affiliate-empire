'use client';

import { useEffect } from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  maxPageButtons?: number;
  showItemCount?: boolean;
  isLoading?: boolean;
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  maxPageButtons = 7,
  showItemCount = true,
  isLoading = false,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isLoading) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (currentPage > 1) {
            e.preventDefault();
            onPageChange(currentPage - 1);
          }
          break;
        case 'ArrowRight':
          if (currentPage < totalPages) {
            e.preventDefault();
            onPageChange(currentPage + 1);
          }
          break;
        case 'Home':
          if (currentPage !== 1) {
            e.preventDefault();
            onPageChange(1);
          }
          break;
        case 'End':
          if (currentPage !== totalPages) {
            e.preventDefault();
            onPageChange(totalPages);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, totalPages, onPageChange, isLoading]);

  // Calculate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const halfButtons = Math.floor(maxPageButtons / 2);

    // Always show first page
    pages.push(1);

    if (currentPage <= halfButtons + 1) {
      // Near start
      for (let i = 2; i <= maxPageButtons - 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - halfButtons) {
      // Near end
      pages.push('...');
      for (let i = totalPages - maxPageButtons + 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Middle
      pages.push('...');
      for (
        let i = currentPage - halfButtons + 1;
        i <= currentPage + halfButtons - 1;
        i++
      ) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageClick = (page: number) => {
    if (page !== currentPage && !isLoading) {
      onPageChange(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 bg-white"
      aria-label="Pagination"
    >
      {/* Item count - Hidden on mobile, shown on larger screens */}
      {showItemCount && (
        <div className="text-sm text-gray-700 order-2 sm:order-1">
          Showing{' '}
          <span className="font-medium">
            {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
          </span>{' '}
          to{' '}
          <span className="font-medium">
            {Math.min(currentPage * itemsPerPage, totalItems)}
          </span>{' '}
          of <span className="font-medium">{totalItems}</span> articles
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-2 order-1 sm:order-2">
        {/* Previous button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1 || isLoading}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page numbers - Hidden on mobile, shown on larger screens */}
        <div className="hidden md:flex gap-1">
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => handlePageClick(pageNum)}
                disabled={isLoading}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Mobile page indicator */}
        <div className="flex md:hidden items-center px-3 py-2 text-sm font-medium text-gray-700">
          Page {currentPage} of {totalPages}
        </div>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || isLoading}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <svg
            className="w-5 h-5 ml-1"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
}
