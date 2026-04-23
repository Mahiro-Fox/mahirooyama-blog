import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

// 安全检查：确保路径在 public 目录内
function isPathSafe(targetPath: string): boolean {
  const resolvedPath = path.resolve(targetPath);
  return resolvedPath.startsWith(PUBLIC_DIR);
}

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

// 2MB 字节数
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// 支持的图片格式
const SUPPORTED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

/**
 * 压缩图片到 2MB 以下
 * 策略：先降低质量，如果仍然超过限制则降低尺寸
 */
async function compressImage(buffer: Buffer, ext: string): Promise<Buffer> {
  let image = sharp(buffer);
  const metadata = await image.metadata();

  // 如果无法获取元数据，直接返回原图
  if (!metadata.width || !metadata.height) {
    return buffer;
  }

  // 检查当前尺寸
  let currentBuffer = buffer;
  let quality = 80;
  let width = metadata.width;
  let height = metadata.height;

  // 循环压缩直到小于 2MB
  while (currentBuffer.length > MAX_FILE_SIZE) {
    // 先尝试降低质量
    if (quality > 30) {
      quality -= 10;
      if (ext === '.jpg' || ext === '.jpeg') {
        currentBuffer = await sharp(buffer)
          .resize(width, height)
          .jpeg({ quality, progressive: true })
          .toBuffer();
      } else if (ext === '.png') {
        currentBuffer = await sharp(buffer)
          .resize(width, height)
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
      } else if (ext === '.webp') {
        currentBuffer = await sharp(buffer)
          .resize(width, height)
          .webp({ quality, effort: 6 })
          .toBuffer();
      } else if (ext === '.avif') {
        currentBuffer = await sharp(buffer)
          .resize(width, height)
          .avif({ quality, effort: 4 })
          .toBuffer();
      }
    } else {
      // 质量降到 30 还超，开始降低尺寸
      width = Math.floor(width * 0.9);
      height = Math.floor(height * 0.9);
      quality = 80; // 重置质量

      if (ext === '.jpg' || ext === '.jpeg') {
        currentBuffer = await sharp(buffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality, progressive: true })
          .toBuffer();
      } else if (ext === '.png') {
        currentBuffer = await sharp(buffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
      } else if (ext === '.webp') {
        currentBuffer = await sharp(buffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality, effort: 6 })
          .toBuffer();
      } else if (ext === '.avif') {
        currentBuffer = await sharp(buffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .avif({ quality, effort: 4 })
          .toBuffer();
      }
    }

    // 防止无限循环：如果尺寸降到 100px 还超，直接返回当前结果
    if (width < 100 || height < 100) {
      break;
    }
  }

  return currentBuffer;
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

    let content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // 如果是图片且大于 2MB，进行压缩
    if (SUPPORTED_IMAGE_EXTS.includes(ext) && content.length > MAX_FILE_SIZE) {
      try {
        content = await compressImage(content, ext);
      } catch (compressError) {
        console.warn('图片压缩失败，返回原图:', compressError);
        // 压缩失败时返回原图
      }
    }

    const uint8Array = new Uint8Array(content);

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
