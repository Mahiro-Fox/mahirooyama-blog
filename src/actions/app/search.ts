'use server';

import { performSearch } from '@/lib/search';

export async function searchContent(query: string, limit: number = 10) {
  if (!query.trim()) {
    return { success: true, results: [] };
  }

  try {
    const results = await performSearch(query, limit);
    return { success: true, results };
  } catch (error) {
    console.error('Search error:', error);
    return { success: false, error: 'Search failed' };
  }
}
