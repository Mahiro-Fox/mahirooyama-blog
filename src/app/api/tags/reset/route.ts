import { NextResponse } from 'next/server';
import { tagStore } from '@/lib/tag-store';
import { requirePermission } from '@/lib/permissions';

// 重置为默认标签
export async function POST() {
  // 需要 blog:delete 权限（因为是危险操作）
  const permissionCheck = await requirePermission('blog:delete');
  if (!permissionCheck.allowed) return permissionCheck.response;

  try {
    const tags = await tagStore.resetToDefault();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('重置标签失败:', error);
    return NextResponse.json({ error: '重置标签失败' }, { status: 500 });
  }
}
