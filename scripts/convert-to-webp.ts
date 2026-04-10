import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// 配置文件夹路径
const INPUT_DIR = './public/images'; // 输入文件夹
const OUTPUT_DIR = './public/images'; // 输出文件夹

async function convertToWebp(filePath: string, targetPath: string) {
  try {
    await sharp(filePath)
      .webp({ quality: 80 }) // 可根据需求调整质量
      .toFile(targetPath);
    console.log(`✅ 转换成功: ${path.basename(targetPath)}`);
  } catch (err) {
    console.error(`❌ 转换失败: ${filePath}`, err);
  }
}

async function walkAndConvert(currentPath: string, targetDir: string) {
  // 确保输出子目录存在
  await fs.mkdir(targetDir, { recursive: true });

  const files = await fs.readdir(currentPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(currentPath, file.name);

    if (file.isDirectory()) {
      // 如果是文件夹，递归处理
      await walkAndConvert(fullPath, path.join(targetDir, file.name));
    } else if (/\.(png|jpg|jpeg)$/i.test(file.name)) {
      // 如果是目标图片，且不存在同名的webp，进行转换
      const fileName = path.parse(file.name).name + '.webp';
      const targetPath = path.join(targetDir, fileName);
      try {
        await fs.access(targetPath);
        console.log(`⏭️ 跳过已存在: ${fileName}`);
      } catch {
        await convertToWebp(fullPath, targetPath);
      }
    }
  }
}

// 执行
walkAndConvert(INPUT_DIR, OUTPUT_DIR)
  .then(() => console.log('🎉 所有图片处理完成！'))
  .catch(console.error);
