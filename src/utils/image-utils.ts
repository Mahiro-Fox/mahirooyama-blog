/**
 * 图片工具函数 (服务端专用)
 * 这些函数使用 Node.js 原生模块，只能在服务端运行
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { UPLOADS_DIR } from '@/constant/dir';

/**
 * 判断图片是否为竖屏图片
 * @param imagePath 相对于 uploads 目录的图片路径
 * @returns 是否是竖屏图片，如果失败返回 false
 */
export async function isPortraitImage(imagePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(process.cwd(), imagePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`图片不存在: ${fullPath}`);
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
  const cleanBaseName = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\w\u4e00-\u9fa5.-]/g, '-');
  const finalFileName = `${cleanBaseName}.webp`;
  const filePath = path.join(fullDir, finalFileName);

  // 保存原始图片（用于下载）
  const originalFilePath = path.join(fullDir, fileName);
  await fs.promises.writeFile(originalFilePath, buffer);

  // 3. 处理图片（生成 WebP 用于展示）
  let pipeline = sharp(buffer);

  if (width || height) {
    pipeline = pipeline.resize(width, height, { fit, position });
  }
  // 转换为 WebP 并保存
  const info = await pipeline.webp({ quality }).toFile(filePath);

  // 4. 返回结果
  const relativeUrl = `/uploads/${dir}/${finalFileName}`.replace(/\/+/g, '/');

  return {
    url: relativeUrl,
    width: info.width,
    height: info.height,
    size: info.size,
  };
}
