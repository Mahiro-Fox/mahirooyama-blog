import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

// 安全检查：确保路径在 public 目录内
function isPathSafe(targetPath: string): boolean {
  const resolvedPath = path.resolve(targetPath);
  return resolvedPath.startsWith(PUBLIC_DIR);
}

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

// 递归删除文件夹
async function deleteFolderRecursive(folderPath: string): Promise<void> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      await deleteFolderRecursive(fullPath);
    } else {
      await fs.unlink(fullPath);
    }
  }

  await fs.rmdir(folderPath);
}

// 获取单个文件（用于预览）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { path: pathSegments } = await params;
    const relativePath = pathSegments.join('/');
    const filePath = path.join(PUBLIC_DIR, relativePath);

    // 安全检查
    if (!isPathSafe(filePath)) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      return NextResponse.json({ error: '无法预览目录' }, { status: 400 });
    }

    const content = await fs.readFile(filePath);
    const uint8Array = new Uint8Array(content);
    const ext = path.extname(filePath).toLowerCase();

    // 根据扩展名设置 Content-Type
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.avif': 'image/avif',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
    };

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentTypeMap[ext] || 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('获取文件失败:', error);
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
}

// 删除文件或文件夹
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { path: pathSegments } = await params;
    const relativePath = pathSegments.join('/');
    const targetPath = path.join(PUBLIC_DIR, relativePath);

    // 安全检查
    if (!isPathSafe(targetPath)) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      await deleteFolderRecursive(targetPath);
      // 刷新缓存
      revalidatePath('/');
      revalidatePath('/blog');
      revalidatePath('/gallery');
      return NextResponse.json({ message: '文件夹删除成功' });
    } else {
      await fs.unlink(targetPath);
      // 刷新缓存
      revalidatePath('/');
      revalidatePath('/blog');
      revalidatePath('/gallery');
      return NextResponse.json({ message: '文件删除成功' });
    }
  } catch (error) {
    console.error('删除失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

// 重命名文件或文件夹
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { path: pathSegments } = await params;
    const { newName } = await request.json();

    if (!newName || newName.trim() === '') {
      return NextResponse.json({ error: '新名称不能为空' }, { status: 400 });
    }

    const relativePath = pathSegments.join('/');
    const oldPath = path.join(PUBLIC_DIR, relativePath);

    // 安全检查
    if (!isPathSafe(oldPath)) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    // 新路径
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName.trim());

    // 安全检查
    if (!isPathSafe(newPath)) {
      return NextResponse.json({ error: '非法名称' }, { status: 403 });
    }

    // 检查新名称是否已存在
    try {
      await fs.access(newPath);
      return NextResponse.json({ error: '目标名称已存在' }, { status: 409 });
    } catch {
      // 继续
    }

    await fs.rename(oldPath, newPath);

    // 刷新缓存
    revalidatePath('/');
    revalidatePath('/blog');
    revalidatePath('/gallery');

    const stats = await fs.stat(newPath);
    return NextResponse.json({
      message: stats.isDirectory() ? '文件夹重命名成功' : '文件重命名成功',
      newPath: '/' + path.relative(PUBLIC_DIR, newPath).replace(/\\/g, '/'),
      type: stats.isDirectory() ? 'directory' : 'file',
    });
  } catch (error) {
    console.error('重命名失败:', error);
    return NextResponse.json({ error: '重命名失败' }, { status: 500 });
  }
}
