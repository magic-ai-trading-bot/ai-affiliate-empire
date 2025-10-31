'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  text: string;
  type: 'recent' | 'popular';
}

export default function SearchBar({
  initialQuery = '',
  onSearch,
  placeholder = 'Search blog articles...',
  className = '',
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('blog-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Fetch popular searches on mount
  useEffect(() => {
    fetchPopularSearches();
  }, []);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPopularSearches = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/content/blog/popular-searches?limit=5`
      );
      if (res.ok) {
        const popularSearches = await res.json();
        return popularSearches;
      }
    } catch (error) {
      console.error('Failed to fetch popular searches:', error);
    }
    return [];
  };

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      // Show recent and popular searches when input is empty
      const popular = await fetchPopularSearches();
      const combined: SearchSuggestion[] = [
        ...recentSearches.slice(0, 3).map((text) => ({ text, type: 'recent' as const })),
        ...popular.slice(0, 5).map((text: string) => ({ text, type: 'popular' as const })),
      ];
      setSuggestions(combined);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/content/blog/search?q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        const autocompleteSuggestions: SearchSuggestion[] = [
          // Recent searches that match
          ...recentSearches
            .filter((recent) =>
              recent.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, 2)
            .map((text) => ({ text, type: 'recent' as const })),
          // API suggestions from keywords
          ...(data.suggestions || []).map((text: string) => ({
            text,
            type: 'popular' as const,
          })),
        ];
        setSuggestions(autocompleteSuggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [recentSearches]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);

    // Debounce API calls
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Add to recent searches
    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('blog-recent-searches', JSON.stringify(updated));

    setShowSuggestions(false);

    // Call callback or navigate
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('blog-recent-searches');
    fetchSuggestions('');
  };

  return (
    <div className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setShowSuggestions(true);
              if (!query) fetchSuggestions('');
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                     transition-colors duration-200"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200
                   dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {isLoading && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            </div>
          )}

          {!isLoading && (
            <>
              {recentSearches.length > 0 &&
                suggestions.some((s) => s.type === 'recent') && (
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Recent Searches
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

              <ul className="py-2">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                               flex items-center gap-3 transition-colors"
                    >
                      {suggestion.type === 'recent' ? (
                        <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {suggestion.text}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
