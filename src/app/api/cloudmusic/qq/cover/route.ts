import { NextRequest, NextResponse } from 'next/server';
import { proxyGoStream } from '@/lib/server/cloudmusic-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cloudmusic/qq/cover?id=&size=
 * 转发 QQ 专辑封面图（浏览器 <img> 直连，强缓存）。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing album id' }, { status: 400 });
  }
  const size = searchParams.get('size') || '300';
  const qs = new URLSearchParams({ id, size });
  // 后端已对封面设置 Cache-Control: max-age=2592000，proxyGoStream 会透传。
  return proxyGoStream(`/api/cloudmusic/qq/cover?${qs.toString()}`, request);
}