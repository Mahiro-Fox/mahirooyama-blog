import { NextResponse } from 'next/server';

import { verifyAuth } from '@/lib/auth';

export async function GET() {
  const result = await verifyAuth();

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || '未登录' },
      { status: 401 }
    );
  }

  return NextResponse.json(result);
}
