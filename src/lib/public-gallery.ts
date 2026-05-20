import fs from 'fs';
import path from 'path';
import { COMPRESSION_CONFIG, PHOTO_DIR } from '@/constant';
import sharp from 'sharp';

const compressedDir = path.join(PHOTO_DIR, '.compressed');

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
 * 确保压缩目录存在
 */
async function ensureCompressedDir(): Promise<void> {
  try {
    await fs.promises.access(compressedDir);
  } catch {
    await fs.promises.mkdir(compressedDir, { recursive: true });
  }
}

/**
 * 获取压缩后的图片路径
 * 如果压缩版本不存在，则创建
 */
async function getCompressedImagePath(
  originalPath: string,
  filename: string
): Promise<string> {
  await ensureCompressedDir();

  const compressedFilename = filename;
  const compressedPath = path.join(compressedDir, compressedFilename);

  // 检查压缩版本是否存在且比原文件新
  try {
    const [origStat, compressedStat] = await Promise.all([
      fs.promises.stat(originalPath),
      fs.promises.stat(compressedPath),
    ]);

    if (compressedStat.mtime >= origStat.mtime) {
      return compressedPath;
    }
  } catch {
    // 压缩文件不存在，继续创建
  }

  // 创建压缩版本
  try {
    const sharpInstance = sharp(originalPath);
    const metadata = await sharpInstance.metadata();

    let pipeline = sharpInstance.webp({
      quality: COMPRESSION_CONFIG.quality,
      effort: COMPRESSION_CONFIG.effort,
    });

    // 如果图片过大，进行缩放
    if (metadata.width && metadata.width > COMPRESSION_CONFIG.maxWidth) {
      pipeline = pipeline.resize({
        width: COMPRESSION_CONFIG.maxWidth,
        height: COMPRESSION_CONFIG.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    await pipeline.toFile(compressedPath);
    return compressedPath;
  } catch (error) {
    console.error(`压缩图片失败 ${filename}:`, error);
    // 压缩失败返回原路径
    return originalPath;
  }
}

/**
 * 获取 public/images/gallery 目录下的所有图片
 * 解析图片尺寸并计算宽高比，自动返回压缩版本
 */
export async function getPublicGalleryImages(): Promise<GalleryImageItem[]> {
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
        // 获取压缩版本路径
        const compressedPath = await getCompressedImagePath(filePath, filename);

        // 从压缩版本读取元数据
        const metadata = await sharp(compressedPath).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const ratio = width > 0 && height > 0 ? width / height : 1;

        // 返回压缩版本的路径（相对于 public）
        const isCompressed = compressedPath.includes('.compressed');
        const src = isCompressed
          ? `/images/gallery/.compressed/${filename}`
          : `/images/gallery/${filename}`;

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

  return images.filter((img): img is GalleryImageItem => img !== null);
}
