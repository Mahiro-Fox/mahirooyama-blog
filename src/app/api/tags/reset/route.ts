import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/permissions';
import { tagStore } from '@/lib/tag-store';

// 重置为默认标签
export async function POST() {
  // 需要 tag:delete 权限（因为是危险操作）
  const permissionCheck = await requirePermission('tag:reset');
  if (!permissionCheck.allowed) return permissionCheck.response;

  try {
    const tags = await tagStore.resetToDefault();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('重置标签失败:', error);
    return NextResponse.json({ error: '重置标签失败' }, { status: 500 });
  }
}
