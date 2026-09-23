import { NextRequest, NextResponse } from 'next/server';
import { proxyGoStream } from '@/lib/server/cloudmusic-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cloudmusic/qq/audio?mid=&mediaMid=&quality=
 * 转发 QQ 音频流（浏览器 <audio> 直连，支持 Range）。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mid = searchParams.get('mid') || searchParams.get('id');
  if (!mid) {
    return NextResponse.json({ error: 'Missing mid' }, { status: 400 });
  }
  const qs = new URLSearchParams({ mid });
  const mediaMid = searchParams.get('mediaMid') || '';
  const quality = searchParams.get('quality') || '';
  if (mediaMid) qs.set('mediaMid', mediaMid);
  if (quality) qs.set('quality', quality);
  return proxyGoStream(`/api/cloudmusic/qq/audio?${qs.toString()}`, request);
}