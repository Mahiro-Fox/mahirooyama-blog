import fs from 'fs';
import path from 'path';
import { PHOTO_DIR } from '@/constant';
import { processAndSaveImage } from '@/utils/image-utils';
import sharp from 'sharp';

export interface PhotoItem {
  id: string;
  src: string;
  filename: string;
  width: number;
  height: number;
  ratio: number;
  alt: string;
}

/**
 * 获取 uploads/images/photo 目录下的所有图片
 * 解析图片尺寸并计算宽高比，自动返回压缩版本
 */
export async function getPhotos(): Promise<PhotoItem[]> {
  try {
    await fs.promises.access(PHOTO_DIR);
  } catch {
    return [];
  }

  const files = await fs.promises.readdir(PHOTO_DIR);
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    // 排除压缩目录和隐藏文件
    if (file.startsWith('.') || file.startsWith('_')) return false;
    return ['.webp'].includes(ext);
  });

  const images = await Promise.all(
    imageFiles.map(async (filename) => {
      const filePath = path.join(PHOTO_DIR, filename);
      const id = path.basename(filename, path.extname(filename));

      try {
        const metadata = await sharp(filePath).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const ratio = width > 0 && height > 0 ? width / height : 1;

        const src = `/uploads/images/gallery/${filename}`

        return {
          id,
          src,
          filename,
          width,
          height,
          ratio,
          alt: id,
        };
      } catch (error) {
        console.error(`获取图片元数据失败 ${filename}`, error);
        return null;
      }
    })
  );

  return images.filter((img): img is PhotoItem => img !== null);
}
