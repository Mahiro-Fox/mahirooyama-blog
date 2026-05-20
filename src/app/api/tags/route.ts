import { NextRequest, NextResponse } from 'next/server';
import { TagType } from '@/constant/tag';
import { tagStore } from '@/store/tag-store';

import { requirePermission } from '@/lib/permissions';

// 获取所有标签
export async function GET() {
  // 需要 tag:read 权限
  const permissionCheck = await requirePermission('tag:read');
  if (!permissionCheck.allowed) return permissionCheck.response;

  try {
    const tags = await tagStore.getAll();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('获取标签失败:', error);
    return NextResponse.json({ error: '获取标签失败' }, { status: 500 });
  }
}

// 创建标签
export async function POST(request: NextRequest) {
  // 需要 tag:create 权限
  const permissionCheck = await requirePermission('tag:create');
  if (!permissionCheck.allowed) return permissionCheck.response;

  try {
    const body = await request.json();
    const { id, name, icon, type, description } = body;

    // 验证必填字段
    if (!id || !name || !type) {
      return NextResponse.json(
        { error: '缺少必填字段: id, name, type' },
        { status: 400 }
      );
    }

    // 验证类型
    if (type !== 'blog' && type !== 'gallery') {
      return NextResponse.json(
        { error: '类型必须是 blog 或 gallery' },
        { status: 400 }
      );
    }

    // 检查标签是否已存在
    const exists = await tagStore.exists(id, type as TagType);
    if (exists) {
      return NextResponse.json({ error: '标签 ID 已存在' }, { status: 409 });
    }

    const tag = await tagStore.create({
      id,
      name,
      icon: icon || 'default',
      type: type as TagType,
      description,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('创建标签失败:', error);
    return NextResponse.json({ error: '创建标签失败' }, { status: 500 });
  }
}
