import { NextRequest, NextResponse } from 'next/server';
import { goFetch, buildQuery } from '@/lib/server/api-client';
import type { Movie } from '@/lib/movies';

// 薄代理：转发到 Go 后端 /api/movies
// 保留此路由兼容可能存在的客户端 fetch 调用，主要数据通道走 Server Action

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search') ?? undefined;
  const tag = request.nextUrl.searchParams.get('tag') ?? undefined;
  const query = buildQuery({ search, tag });

  try {
    const movies = await goFetch<Movie[]>(`/api/movies${query}`);
    return NextResponse.json(movies);
  } catch (error) {
    return NextResponse.json(
      { error: '获取电影列表失败', details: String(error) },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const created = await goFetch<Movie>('/api/movies', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: '创建电影失败', details: String(error) },
      { status: 400 }
    );
  }
}
