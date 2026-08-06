'use client';

import { useCallback, useState } from 'react';
import { searchContent } from '@/actions/search';
import type { SearchResult } from '@/lib/search';
import { debounce } from '@/utils/utils';

/**
 * Search hook
 * @returns search state and functions
 */
export function useSearch(limit = 10) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const result = await searchContent(query, limit);
        if (result.success) {
          setResults(result.results || []);
        } else {
          console.error('Search error:', result.error);
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  const debouncedSearch = useCallback(debounce(search, 300), [search]);

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
  }, []);

  return {
    keyword,
    setKeyword: handleKeywordChange,
    results,
    isLoading,
    clearSearch,
  };
}
