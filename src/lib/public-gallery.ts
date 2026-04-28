import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const galleryDir = path.join(process.cwd(), 'public', 'images', 'gallery');

export interface GalleryImageItem {
  id: string;
  src: string;
  filename: string;
  width: number;
  height: number;
  ratio: number;
  alt: string;
}

/**
 * 获取 public/images/gallery 目录下的所有图片
 * 解析图片尺寸并计算宽高比
 */
export async function getPublicGalleryImages(): Promise<GalleryImageItem[]> {
  try {
    await fs.promises.access(galleryDir);
  } catch {
    return [];
  }

  const files = await fs.promises.readdir(galleryDir);
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    // return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    // 目前只展示 webp 格式
    return ['.webp'].includes(ext);
  });

  const images = await Promise.all(
    imageFiles.map(async (filename) => {
      const filePath = path.join(galleryDir, filename);
      const id = path.basename(filename, path.extname(filename));

      try {
        const metadata = await sharp(filePath).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const ratio = width > 0 && height > 0 ? width / height : 1;

        return {
          id,
          src: `/images/gallery/${filename}`,
          filename,
          width,
          height,
          ratio,
          alt: id,
        };
      } catch {
        return null;
      }
    })
  );

  return images.filter((img): img is GalleryImageItem => img !== null);
}
