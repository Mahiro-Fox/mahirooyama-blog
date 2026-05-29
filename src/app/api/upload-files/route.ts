import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { UPLOADS_DIR } from '@/constant/dir';
import {
  checkFileConflict,
  ensureDirectory,
  isPathSafe,
} from '@/utils/file-utils';
import sharp from 'sharp';

import { requirePermission } from '@/lib/permissions';

// 安全配置
const ALLOWED_MIME_TYPES = [
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  // 视频
  'video/mp4',
  'video/webm',
  // 音频
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // 文档
  'application/pdf',
  // 压缩包
  'application/zip',
  'application/x-rar-compressed',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES_COUNT = 20;

/**
 * 验证文件是否符合上传要求
 */
function validateFile(file: File): string | null {
  if (!file.name || file.name.trim() === '') {
    return '文件名不能为空';
  }

  if (file.size === 0) {
    return `文件 ${file.name} 是空文件`;
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `文件 ${file.name} (${sizeMB}MB) 超过单文件限制 (${MAX_FILE_SIZE / (1024 * 1024)}MB)`;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `不支持的文件类型: ${file.type || '未知'} (${file.name})`;
  }

  return null;
}

// 上传文件到指定目录（需要 files:upload 权限）
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission('files:upload');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path') || '';
    const targetDir = path.join(UPLOADS_DIR, relativePath);

    // 安全检查
    if (!isPathSafe(targetDir, UPLOADS_DIR)) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '没有提供文件' }, { status: 400 });
    }

    if (files.length > MAX_FILES_COUNT) {
      return NextResponse.json(
        {
          error: `文件数量超过限制，最多允许 ${MAX_FILES_COUNT} 个文件`,
        },
        { status: 400 }
      );
    }

    // 验证所有文件
    const validationErrors: string[] = [];
    let totalSize = 0;

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      }
      totalSize += file.size;
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: '文件验证失败',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
      const maxMB = MAX_TOTAL_SIZE / (1024 * 1024);
      return NextResponse.json(
        {
          error: `总文件大小 (${totalMB}MB) 超过限制 (${maxMB}MB)`,
        },
        { status: 400 }
      );
    }

    await ensureDirectory(targetDir);

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
        const webPath = '/uploads/' + itemRelativePath.replace(/\\/g, '/');

        // 检查是否为可转换的图片格式
        const ext = path.extname(safeName).toLowerCase();
        const convertibleImageExts = ['.png', '.jpg', '.jpeg'];

        if (convertibleImageExts.includes(ext)) {
          try {
            const baseName = path.basename(safeName, ext);
            const webpName = `${baseName}.webp`;
            const webpPath = path.join(targetDir, webpName);

            // 转换图片为 WebP
            await sharp(buffer).webp({ quality: 50 }).toFile(webpPath);
            const webpRelativePath = path.join(relativePath, webpName);
            const webpWebPath =
              '/uploads/' + webpRelativePath.replace(/\\/g, '/');

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
