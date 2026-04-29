import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { checkFileConflict, FileUtils } from '@/utils/file-utils';
import sharp from 'sharp';

import { requirePermission } from '@/lib/permissions';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  createdAt: string;
  updatedAt: string;
  extension?: string;
}

// 获取指定目录的文件列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path') || '';
    const targetDir = path.join(PUBLIC_DIR, relativePath);

    // 安全检查
    if (!FileUtils.isPathSafe(targetDir, PUBLIC_DIR)) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    // 确保目录存在
    try {
      const stats = await fs.stat(targetDir);
      if (!stats.isDirectory()) {
        return NextResponse.json({ error: '不是目录' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: '目录不存在' }, { status: 404 });
    }

    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    const items: FileItem[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(targetDir, entry.name);
        const stats = await fs.stat(fullPath);

        // 构建相对 public 的路径
        const itemRelativePath = path.join(relativePath, entry.name);
        const webPath = '/' + itemRelativePath.replace(/\\/g, '/');

        return {
          name: entry.name,
          path: webPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
          extension: entry.isDirectory()
            ? undefined
            : path.extname(entry.name).toLowerCase(),
        };
      })
    );

    // 排序：文件夹在前，然后按名称排序
    items.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    // 获取面包屑
    const breadcrumb = relativePath
      ? relativePath.split(/[/\\]/).filter(Boolean)
      : [];

    return NextResponse.json({
      items,
      currentPath: relativePath,
      breadcrumb,
    });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 });
  }
}

// 上传文件到指定目录（需要 files:upload 权限）
export async function POST(request: NextRequest) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('files:upload');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path') || '';
    const targetDir = path.join(PUBLIC_DIR, relativePath);

    // 安全检查
    if (!FileUtils.isPathSafe(targetDir, PUBLIC_DIR)) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '没有提供文件' }, { status: 400 });
    }

    // 确保目录存在
    await FileUtils.ensureDirectory(targetDir);

    const results = await Promise.all(
      files.map(async (file) => {
        // 清理文件名（保留中文）
        const safeName = file.name.replace(/[^\w\u4e00-\u9fa5.-]/g, '-');
        const filePath = path.join(targetDir, safeName);

        // 检查文件是否已存在
        const conflict = await checkFileConflict(filePath);
        if (conflict) {
          return { name: safeName, success: false, error: conflict.error };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        // 构建 web 路径
        const itemRelativePath = path.join(relativePath, safeName);
        const webPath = '/' + itemRelativePath.replace(/\\/g, '/');

        // 检查是否为可转换的图片格式
        const ext = path.extname(safeName).toLowerCase();
        const convertibleImageExts = ['.png', '.jpg', '.jpeg'];

        if (convertibleImageExts.includes(ext)) {
          try {
            const baseName = path.basename(safeName, ext);
            const webpName = `${baseName}.webp`;
            const webpPath = path.join(targetDir, webpName);

            // 转换图片为 WebP
            await sharp(filePath)
              .webp({
                quality: 80,
                effort: 4,
              })
              .toFile(webpPath);

            const webpRelativePath = path.join(relativePath, webpName);
            const webpWebPath = '/' + webpRelativePath.replace(/\\/g, '/');

            return {
              name: safeName,
              path: webPath,
              webpPath: webpWebPath,
              webpName: webpName,
              success: true,
              converted: true,
            };
          } catch (convertError) {
            console.error(`转换 WebP 失败: ${safeName}`, convertError);
            // 转换失败但原始文件已保存，仍返回成功
            return {
              name: safeName,
              path: webPath,
              success: true,
              converted: false,
            };
          }
        }

        return { name: safeName, path: webPath, success: true };
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      message: `上传完成: ${successCount} 成功, ${failCount} 失败`,
      results,
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}

// 创建新文件夹（需要 files:manageFolder 权限）
export async function PATCH(request: NextRequest) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('files:manageFolder');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path') || '';
    const { folderName } = await request.json();

    if (!folderName || folderName.trim() === '') {
      return NextResponse.json(
        { error: '文件夹名称不能为空' },
        { status: 400 }
      );
    }

    const targetDir = path.join(PUBLIC_DIR, relativePath);

    // 安全检查
    if (!FileUtils.isPathSafe(targetDir, PUBLIC_DIR)) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    const newFolderPath = path.join(targetDir, folderName.trim());

    // 安全检查
    if (!FileUtils.isPathSafe(newFolderPath, PUBLIC_DIR)) {
      return NextResponse.json({ error: '非法文件夹名称' }, { status: 403 });
    }

    // 检查文件夹是否已存在
    const conflict = await checkFileConflict(newFolderPath);
    if (conflict) {
      return NextResponse.json(
        { error: conflict.error },
        { status: conflict.status }
      );
    }

    await FileUtils.ensureDirectory(newFolderPath);

    return NextResponse.json({
      message: '文件夹创建成功',
      folderName: folderName.trim(),
    });
  } catch (error) {
    console.error('创建文件夹失败:', error);
    return NextResponse.json({ error: '创建文件夹失败' }, { status: 500 });
  }
}
