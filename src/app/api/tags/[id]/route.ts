import { NextRequest, NextResponse } from 'next/server';
import { TagType } from '@/constant/tag';
import { tagStore } from '@/store/tag-store';

import { requirePermission } from '@/lib/permissions';

// 更新标签
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 需要 tag:update 权限
  const permissionCheck = await requirePermission('tag:update');
  if (!permissionCheck.allowed) return permissionCheck.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { type, ...updates } = body;

    if (!type || (type !== 'blog' && type !== 'gallery')) {
      return NextResponse.json(
        { error: '需要提供有效的类型 (blog 或 gallery)' },
        { status: 400 }
      );
    }

    const tag = await tagStore.update(id, type as TagType, updates);
    if (!tag) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error('更新标签失败:', error);
    return NextResponse.json({ error: '更新标签失败' }, { status: 500 });
  }
}

// 删除标签
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 需要 tag:delete 权限
  const permissionCheck = await requirePermission('tag:delete');
  if (!permissionCheck.allowed) return permissionCheck.response;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as TagType;

    if (!type || (type !== 'blog' && type !== 'gallery')) {
      return NextResponse.json(
        { error: '需要提供有效的类型参数 (blog 或 gallery)' },
        { status: 400 }
      );
    }

    const deleted = await tagStore.delete(id, type);
    if (!deleted) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 });
    }

    return NextResponse.json({ message: '标签已删除' });
  } catch (error) {
    console.error('删除标签失败:', error);
    return NextResponse.json({ error: '删除标签失败' }, { status: 500 });
  }
}
