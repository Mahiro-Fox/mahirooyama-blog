/**
 * 图片工具函数 (服务端专用)
 * 这些函数使用 Node.js 原生模块，只能在服务端运行
 */

import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '@/constant/dir';
import sharp from 'sharp';
import { COMPRESSED_MAX_IMAGE_FILE_SIZE } from '@/config';

/**
 * 生成低质量图片占位符 (LQIP)
 * 用于服务端生成 blurDataURL
 */
export async function generateBlurDataURL(
  imagePath: string,
  width: number = 10
): Promise<string | null> {
  try {
    const fullPath = path.join(UPLOADS_DIR, imagePath);

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
      UPLOADS_DIR,
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
    UPLOADS_DIR,
    getThumbnailPath(originalPath, width, format)
  );
  return fs.existsSync(thumbPath);
}

/**
 * 判断图片是否为竖屏图片
 * @param imagePath 相对于 uploads 目录的图片路径
 * @returns 是否是竖屏图片，如果失败返回 false
 */
export async function isPortraitImage(imagePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(UPLOADS_DIR, imagePath);

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

/**
 * 压缩图片并保存为 WebP 格式
 * @param buffer 图片 Buffer
 * @param options 处理选项
 * @returns 处理结果，包含相对路径和尺寸信息
 */
export async function processAndSaveImage(
  buffer: Buffer,
  options: {
    dir: string;
    fileName: string;
    quality?: number;
    width?: number;
    height?: number;
    fit?: keyof sharp.FitEnum;
    position?: string;
  }
): Promise<{ url: string; width: number; height: number; size: number }> {
  const {
    dir,
    fileName,
    quality = 50,
    width,
    height,
    fit = 'cover',
    position = 'center',
  } = options;

  // 1. 确保目录存在
  const fullDir = path.join(UPLOADS_DIR, dir);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }

  // 2. 生成文件名
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^\w\u4e00-\u9fa5.-]/g, '-');
  const finalFileName = `${cleanBaseName}.webp`;
  const filePath = path.join(fullDir, finalFileName);
  
  // 保存原始图片
  const originalFilePath = path.join(fullDir, fileName);
  await fs.promises.writeFile(originalFilePath, buffer);

  // 3. 处理图片
  let pipeline = sharp(buffer);

  if (width || height) {
    pipeline = pipeline.resize(width, height, { fit, position });
  }
   // 转换为 WebP 并保存
  const info = await pipeline
    .webp({ quality })
    .toFile(filePath);

  // 4. 返回结果
  const relativeUrl = `/uploads/${dir}/${finalFileName}`.replace(/\/+/g, '/');

  return {
    url: relativeUrl,
    width: info.width,
    height: info.height,
    size: info.size,
  };
}
