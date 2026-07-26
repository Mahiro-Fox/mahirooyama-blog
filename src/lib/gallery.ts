import fs from 'fs';
import path from 'path';
import { GALLERY_DIR } from '@/constant';
import { ensureDirectory } from '@/utils/file-utils';
import { isPortraitImage } from '@/utils/image-utils';

export type Gallery = {
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  isPortrait: boolean;
  lastUpdated: string;
  tags?: string[];
};

export type AdminGallery = Gallery & {
  fileName: string;
  src: string;
  size: number;
};

export async function getGalleries(
  isAdmin?: boolean
): Promise<AdminGallery[] | Gallery[]> {
  await ensureDirectory(GALLERY_DIR);
  const files = await fs.promises.readdir(GALLERY_DIR);
  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  const images = await Promise.all(
    jsonFiles.map(async (filePath) => {
      const fullPath = path.join(GALLERY_DIR, filePath);
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      const data = JSON.parse(content);
      const slug = path.basename(fullPath, path.extname(fullPath));

      if (isAdmin) {
        const stats = await fs.promises.stat(fullPath);
        // 目前没这个字段，先判断是否有这个字段，如果没有，则添加该字段
        const isPortrait = await isPortraitImage(data.thumbnail);
        data.isPortrait = isPortrait;
        await fs.promises.writeFile(
          fullPath,
          JSON.stringify(data, null, 2),
          'utf-8'
        );
        return {
          slug,
          fileName: filePath,
          src: data.thumbnail || '',
          size: stats.size,
          ...data,
        };
      } else {
        return {
          slug,
          ...data,
        };
      }
    })
  );

  return images;
}
