import fs from 'fs';
import path from 'path';
import { PHOTO_DIR, UPLOADS_DIR } from '@/constant';
import sharp from 'sharp';
import { ensureDirectory } from '@/utils/file-utils';

export interface PhotoItem {
  id: string;
  src: string;
  filename: string;
  width: number;
  height: number;
  ratio: number;
  alt: string;
  lastUpdatedAt: string;
}

/**
 * 获取指定目录下的所有图片
 * 解析图片尺寸并计算宽高比，自动返回可直接访问的 URL
 */
export async function getPhotos(
  dir: string = PHOTO_DIR,
  extensions: string[] = ['.webp']
): Promise<PhotoItem[]> {
  await ensureDirectory(dir);
  const files = await fs.promises.readdir(dir);
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    // 排除压缩目录和隐藏文件
    if (file.startsWith('.') || file.startsWith('_')) return false;
    return extensions.includes(ext);
  });

  const images = await Promise.all(
    imageFiles.map(async (filename) => {
      const filePath = path.join(dir, filename);
      const id = path.basename(filename, path.extname(filename));

      try {
        const [stats, metadata] = await Promise.all([
          fs.promises.stat(filePath),
          sharp(filePath).metadata(),
        ]);
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const ratio = width > 0 && height > 0 ? width / height : 1;

        // 由目录推导静态资源 URL，保证任意子目录都能正确访问
        const relative = path.relative(UPLOADS_DIR, filePath);
        const src = `/uploads/${relative.split(path.sep).join('/')}`;

        return {
          id,
          src,
          filename,
          width,
          height,
          ratio,
          alt: id,
          lastUpdatedAt: stats.mtime.toISOString(),
        };
      } catch (error) {
        console.error(`获取图片元数据失败 ${filename}`, error);
        return null;
      }
    })
  );

  return images.filter((img): img is PhotoItem => img !== null);
}
