import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { compressImage } from '../src/utils/image-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'uploads', 'images');

// 支持的图片格式
const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

async function processDirectory(dirPath: string) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  const images = entries.filter(e => {
    const ext = path.extname(e.name).toLowerCase();
    return e.isFile() && SUPPORTED_EXTS.includes(ext) && !e.name.startsWith('.');
  });

  if (images.length > 0) {
    const compressedDir = path.join(dirPath, '.compressed');
    await fs.mkdir(compressedDir, { recursive: true });

    for (const img of images) {
      const inputPath = path.join(dirPath, img.name);
      const ext = path.extname(img.name).toLowerCase();
      const outputName = `${path.basename(img.name, ext)}.webp`;
      const outputPath = path.join(compressedDir, outputName);

      // 检查是否已存在
      try {
        await fs.access(outputPath);
        // console.log(`⏭️  跳过已存在: ${img.name}`);
        continue;
      } catch {
        // 继续压缩
      }

      try {
        const buffer = await fs.readFile(inputPath);
        const compressedBuffer = await compressImage(buffer, ext);
        await fs.writeFile(outputPath, compressedBuffer);
        console.log(`✅ 压缩成功: ${path.relative(IMAGES_DIR, inputPath)} -> .compressed/${outputName}`);
      } catch (error) {
        console.error(`❌ 压缩失败 ${img.name}:`, error);
      }
    }
  }

  // 递归处理子目录，排除 .compressed 和 thumbs
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '.compressed' && entry.name !== 'thumbs') {
      await processDirectory(path.join(dirPath, entry.name));
    }
  }
}

async function main() {
  console.log('🚀 开始批量压缩图片:', IMAGES_DIR);
  try {
    // 确保根目录存在
    await fs.access(IMAGES_DIR);
    await processDirectory(IMAGES_DIR);
    console.log('✨ 批量压缩任务完成！');
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.error('❌ 目录不存在:', IMAGES_DIR);
    } else {
      console.error('💥 批量压缩执行出错:', error);
    }
  }
}

main();
