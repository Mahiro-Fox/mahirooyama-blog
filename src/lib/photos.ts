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

/**
 * 图库作者（一级子目录）摘要：用于先展示作者，再按作者加载作品。
 */
export interface PhotoCollection {
  /** 子目录名，同时作为作者标识 */
  id: string;
  /** 展示用的作者名 */
  name: string;
  /** 该作者名下的图片数量 */
  count: number;
  /** 封面图 URL，取该目录中最新的图片 */
  cover: string | null;
  width: number;
  height: number;
  ratio: number;
  lastUpdatedAt: string;
}

/**
 * 读取指定目录下的一级子目录，聚合为作者列表。
 * 只读取封面图的元数据，避免为统计数量而解析整目录的图片。
 */
export async function getPhotoCollections(
  dir: string,
  extensions: string[] = ['.webp']
): Promise<PhotoCollection[]> {
  await ensureDirectory(dir);
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  const candidates = entries.filter(
    (entry) =>
      entry.isDirectory() &&
      !entry.name.startsWith('.') &&
      !entry.name.startsWith('_')
  );

  const collections = await Promise.all(
    candidates.map(async (entry): Promise<PhotoCollection | null> => {
      const collectionDir = path.join(dir, entry.name);

      try {
        const files = await fs.promises.readdir(collectionDir);
        const imageFiles = files.filter(
          (file) =>
            !file.startsWith('.') &&
            !file.startsWith('_') &&
            extensions.includes(path.extname(file).toLowerCase())
        );

        if (imageFiles.length === 0) return null;

        // 取最新修改的图片作为封面
        const withStats = await Promise.all(
          imageFiles.map(async (filename) => {
            const stats = await fs.promises.stat(
              path.join(collectionDir, filename)
            );
            return { filename, mtime: stats.mtime };
          })
        );
        withStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        const newest = withStats[0];
        const coverPath = path.join(collectionDir, newest.filename);

        let width = 0;
        let height = 0;
        try {
          const metadata = await sharp(coverPath).metadata();
          width = metadata.width ?? 0;
          height = metadata.height ?? 0;
        } catch (error) {
          console.error(`获取封面元数据失败 ${entry.name}`, error);
        }

        const relative = path.relative(UPLOADS_DIR, coverPath);

        return {
          id: entry.name,
          name: entry.name,
          count: imageFiles.length,
          cover: `/uploads/${relative.split(path.sep).join('/')}`,
          width,
          height,
          ratio: width > 0 && height > 0 ? width / height : 1,
          lastUpdatedAt: newest.mtime.toISOString(),
        };
      } catch (error) {
        console.error(`读取作者目录失败 ${entry.name}`, error);
        return null;
      }
    })
  );

  return collections
    .filter((collection): collection is PhotoCollection => collection !== null)
    .sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));
}
