'use client';

import { useCallback, useRef, useState } from 'react';

export type SearchResult = {
  type: 'blog' | 'gallery';
  title: string;
  description: string;
  slug: string;
  thumbnail?: string;
  tags?: string[];
  createdAt: string;
  matchScore: number;
};

/**
 * Search hook
 * @returns search state and functions
 */
export function useSearch(limit = 10) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`
        );
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        search(query);
      }, 300);
    },
    [search]
  );

  const handleKeywordChange = useCallback(
    (value: string) => {
      setKeyword(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const clearSearch = useCallback(() => {
    setKeyword('');
    setResults([]);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return {
    keyword,
    setKeyword: handleKeywordChange,
    results,
    isLoading,
    clearSearch,
  };
}
