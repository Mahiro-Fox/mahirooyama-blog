import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  // 验证刷新缓存权限
  const permissionCheck = await requirePermission('system:revalidate');
  if (!permissionCheck.allowed) {
    return permissionCheck.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { type = 'all' } = body;

    const results: string[] = [];

    switch (type) {
      case 'all':
        revalidatePath('/', 'layout');
        break;

      case 'path':
        // 重新验证指定路径
        if (body.path) {
          revalidatePath(body.path);
          results.push(`✓ ${body.path}`);
        }
        break;

      default:
        return NextResponse.json({ error: '无效的刷新类型' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '缓存刷新成功',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('刷新缓存失败:', error);
    return NextResponse.json(
      { error: '刷新缓存失败', details: String(error) },
      { status: 500 }
    );
  }
}
