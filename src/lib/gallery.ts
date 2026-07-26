import fs from 'fs';
import path from 'path';
import { GALLERY_DIR } from '@/constant';
import { ensureDirectory } from '@/utils/file-utils';

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
        return {
          slug,
          fileName: filePath,
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
