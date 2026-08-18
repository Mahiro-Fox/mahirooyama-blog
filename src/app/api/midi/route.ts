import { NextResponse } from 'next/server';
import { goFetch } from '@/lib/server/api-client';

// GET /api/midi - 转发到 Go 后端 /api/midi
export async function GET() {
  try {
    const data = await goFetch<{ success: boolean; files: unknown[] }>(
      '/api/midi'
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error('API 转发获取 MIDI 列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取文件列表失败' },
      { status: 500 }
    );
  }
}
