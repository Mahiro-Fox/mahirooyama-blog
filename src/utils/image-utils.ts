/**
 * 图片工具函数 (服务端专用)
 * 这些函数使用 Node.js 原生模块，只能在服务端运行
 */

import fs from 'fs';
import path from 'path';
import { PUBLIC_DIR } from '@/constant/dir';
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
    const fullPath = path.join(PUBLIC_DIR, imagePath);

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
      PUBLIC_DIR,
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
    PUBLIC_DIR,
    getThumbnailPath(originalPath, width, format)
  );
  return fs.existsSync(thumbPath);
}

/**
 * 判断图片是否为竖屏图片
 * @param imagePath 相对于 public 目录的图片路径
 * @returns 是否是竖屏图片，如果失败返回 false
 */
export async function isPortraitImage(imagePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(PUBLIC_DIR, imagePath);

    if (!fs.existsSync(fullPath)) {
      return false;
    }

    const metadata = await sharp(fullPath).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const isPortrait = height > width;

    return isPortrait;
  } catch {
    return false;
  }
}
