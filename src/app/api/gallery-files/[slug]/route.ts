import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { GALLERY_DIR } from '@/constant/dir';

import { requirePermission } from '@/lib/permissions';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// 获取单个文件内容
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // 尝试 .json 扩展名
    const filePath = path.join(GALLERY_DIR, `${slug}.json`);
    const content = await fs.readFile(filePath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('获取图库文件失败:', error);
    return NextResponse.json(
      { error: '文件不存在或读取失败' },
      { status: 404 }
    );
  }
}

// 删除文件（需要 gallery:delete 权限）
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('gallery:delete');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const { slug } = await params;

    // 尝试 .json 扩展名
    const filePath = path.join(GALLERY_DIR, `${slug}.json`);

    await fs.unlink(filePath);

    return NextResponse.json({ message: '文件删除成功' });
  } catch (error) {
    console.error('删除图库文件失败:', error);
    return NextResponse.json(
      { error: '删除失败，文件可能不存在' },
      { status: 500 }
    );
  }
}

// 更新文件（需要 gallery:update 权限）
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('gallery:update');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const { slug } = await params;
    const { content } = await request.json();

    const filePath = path.join(GALLERY_DIR, `${slug}.json`);

    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ message: '文件更新成功' });
  } catch (error) {
    console.error('更新图库文件失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// 重命名文件（需要 gallery:update 权限）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('gallery:update');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const { slug } = await params;
    const { newSlug } = await request.json();

    if (!newSlug || newSlug.trim() === '') {
      return NextResponse.json({ error: '新文件名不能为空' }, { status: 400 });
    }

    // 清理新文件名
    const cleanNewSlug = newSlug.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();

    // 尝试找到原文件
    const oldFilePath = path.join(GALLERY_DIR, `${slug}.json`);
    try {
      await fs.access(oldFilePath);
    } catch {
      return NextResponse.json({ error: '原文件不存在' }, { status: 404 });
    }

    // 检查新文件名是否已存在
    const newFilePath = path.join(GALLERY_DIR, `${cleanNewSlug}.json`);
    try {
      await fs.access(newFilePath);
      return NextResponse.json(
        { error: `文件 ${cleanNewSlug}.json 已存在` },
        { status: 409 }
      );
    } catch {
      // 文件不存在，可以继续
    }

    // 重命名文件
    await fs.rename(oldFilePath, newFilePath);

    return NextResponse.json({
      message: '文件重命名成功',
      oldSlug: slug,
      newSlug: cleanNewSlug,
      fileName: `${cleanNewSlug}.json`,
    });
  } catch (error) {
    console.error('重命名图库文件失败:', error);
    return NextResponse.json({ error: '重命名失败' }, { status: 500 });
  }
}
