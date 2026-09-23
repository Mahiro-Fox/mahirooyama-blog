import { NextRequest, NextResponse } from 'next/server';
import { proxyGoStream } from '@/lib/server/cloudmusic-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cloudmusic/netease/audio?id=&br=
 * 转发网易云音频流（浏览器 <audio> 直连，支持 Range）。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  const br = searchParams.get('br') || '';
  const qs = new URLSearchParams({ id });
  if (br) qs.set('br', br);
  return proxyGoStream(`/api/cloudmusic/netease/audio?${qs.toString()}`, request);
}