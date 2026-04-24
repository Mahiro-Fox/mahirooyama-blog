import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { requirePermission } from '@/lib/permissions';

// 需要重新验证的路径列表
const PATHS_TO_REVALIDATE = [
  '/', // 首页
  '/blog', // 博客列表
  '/gallery', // 画廊列表
  '/page/blog/[page]', // 博客分页
  '/page/gallery/[page]', // 画廊分页
  '/tag/blog/[slug]', // 博客标签
  '/tag/gallery/[slug]', // 画廊标签
];

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
        // 重新验证所有主要路径
        for (const path of PATHS_TO_REVALIDATE) {
          try {
            revalidatePath(path, 'layout');
            results.push(`✓ ${path}`);
          } catch (error) {
            results.push(`✗ ${path}: ${error}`);
          }
        }
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
