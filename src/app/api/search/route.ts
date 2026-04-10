import { NextRequest, NextResponse } from 'next/server';
import { performSearch } from '@/lib/search';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (!keyword.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await performSearch(keyword, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
