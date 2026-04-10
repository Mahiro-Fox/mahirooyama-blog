/**
 * 图片工具函数 (服务端专用)
 * 这些函数使用 Node.js 原生模块，只能在服务端运行
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * 生成低质量图片占位符 (LQIP)
 * 用于服务端生成 blurDataURL
 */
export async function generateBlurDataURL(
  imagePath: string,
  width: number = 10
): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), 'public', imagePath);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const buffer = await sharp(fullPath)
      .resize(width, null, { withoutEnlargement: true })
      .blur()
      .toBuffer();

    return `data:image/webp;base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * 从缩略图元数据文件读取 blurDataURL
 */
export async function getBlurPlaceholder(
  imagePath: string
): Promise<string | null> {
  try {
    const blurPath = path.join(
      process.cwd(),
      'public',
      path.dirname(imagePath),
      'thumbs',
      'blur',
      `${path.basename(imagePath, path.extname(imagePath))}-blur.json`
    );

    if (!fs.existsSync(blurPath)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(blurPath, 'utf-8'));
    return data.blurDataURL;
  } catch {
    return null;
  }
}

/**
 * 获取缩略图路径
 */
export function getThumbnailPath(
  originalPath: string,
  width: number,
  format: 'webp' | 'avif' = 'webp'
): string {
  const dir = path.dirname(originalPath);
  const filename = path.basename(originalPath, path.extname(originalPath));
  return path.join(dir, 'thumbs', `${filename}-${width}.${format}`);
}

/**
 * 检查缩略图是否存在
 */
export function hasThumbnail(
  originalPath: string,
  width: number,
  format: 'webp' | 'avif' = 'webp'
): boolean {
  const thumbPath = path.join(
    process.cwd(),
    'public',
    getThumbnailPath(originalPath, width, format)
  );
  return fs.existsSync(thumbPath);
}
