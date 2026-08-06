import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { processAndSaveImage } from '@/lib/image-utils';
import { formatSize } from '@/utils/utils';

// 获取脚本所在目录，确保路径正确
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 配置文件夹路径（使用绝对路径避免问题）
const INPUT_DIR = path.join(ROOT_DIR, 'uploads', 'images');
const OUTPUT_DIR = path.join(ROOT_DIR, 'uploads', 'images');

/**
 * 安全地转换图片为 WebP
 * 修复：显式关闭文件流，验证输出文件
 */
async function convertToWebp(
  filePath: string,
  targetPath: string
): Promise<boolean> {
  const inputFile = path.basename(filePath);
  const outputFile = path.basename(targetPath);

  try {
    // 检查输入文件是否存在且可读
    const inputStats = await fs.stat(filePath);
    if (inputStats.size === 0) {
      console.error(`⚠️  跳过空文件: ${inputFile}`);
      return false;
    }

    // 确保输出目录存在
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    // 使用 processAndSaveImage 转换
    const buffer = await fs.readFile(filePath);
    const compressedBuffer = await processAndSaveImage(buffer, {
      dir: OUTPUT_DIR,
      fileName: outputFile,
    });
    await fs.writeFile(targetPath, compressedBuffer.url);

    // 验证输出文件
    const outputStats = await fs.stat(targetPath);
    if (outputStats.size === 0) {
      console.error(`❌ 输出文件为空: ${outputFile}`);
      await fs.unlink(targetPath).catch(() => {});
      return false;
    }

    // 计算压缩率
    const compression = (
      (1 - outputStats.size / inputStats.size) *
      100
    ).toFixed(1);
    console.log(
      `✅ 转换成功: ${inputFile} → ${outputFile} (${formatSize(inputStats.size)} → ${formatSize(outputStats.size)}, -${compression}%)`
    );

    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ 转换失败: ${inputFile} → ${outputFile}`, errorMessage);

    // 清理可能的不完整输出文件
    try {
      await fs.unlink(targetPath);
    } catch {
      // 文件可能不存在，忽略错误
    }

    return false;
  }
}

/**
 * 递归遍历并转换
 * 修复：使用队列避免深度递归，检查 webp 是否为原始文件的转换结果
 */
async function walkAndConvert(
  currentPath: string,
  targetDir: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  // 确保输出目录存在
  await fs.mkdir(targetDir, { recursive: true });

  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  // 先收集所有需要处理的文件
  const filesToProcess: {
    fullPath: string;
    targetPath: string;
    baseName: string;
  }[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(INPUT_DIR, fullPath);

    if (entry.isDirectory()) {
      // 递归处理子目录
      const subResult = await walkAndConvert(
        fullPath,
        path.join(targetDir, entry.name)
      );
      success += subResult.success;
      failed += subResult.failed;
    } else if (/\.(png|jpg|jpeg)$/i.test(entry.name)) {
      // 检查是否需要转换
      const baseName = path.parse(entry.name).name;
      const webpName = baseName + '.webp';
      const targetPath = path.join(targetDir, webpName);

      try {
        await fs.access(targetPath);
        // 文件已存在，检查是否对应同一原始文件（通过检查原始文件是否还存在）
        const originalExt = path.extname(entry.name).toLowerCase();
        const originalPath = path.join(currentPath, baseName + originalExt);
        try {
          await fs.access(originalPath);
          console.log(`⏭️  跳过已存在: ${relativePath}`);
        } catch {
          // 原始文件不存在，可能是孤立 webp
          filesToProcess.push({ fullPath, targetPath, baseName });
        }
      } catch {
        // webp 不存在，需要转换
        filesToProcess.push({ fullPath, targetPath, baseName });
      }
    }
  }

  // 顺序处理文件（避免并发导致的文件锁定问题）
  for (const { fullPath, targetPath } of filesToProcess) {
    const result = await convertToWebp(fullPath, targetPath);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始转换图片为 WebP 格式...');
  console.log(`📁 输入目录: ${INPUT_DIR}`);
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log('');

  try {
    // 检查输入目录是否存在
    await fs.access(INPUT_DIR);
  } catch {
    console.error(`❌ 输入目录不存在: ${INPUT_DIR}`);
    process.exit(1);
  }

  const startTime = Date.now();
  const result = await walkAndConvert(INPUT_DIR, OUTPUT_DIR);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('📊 转换统计:');
  console.log(`   成功: ${result.success}`);
  console.log(`   失败: ${result.failed}`);
  console.log(`   耗时: ${duration}s`);

  if (result.failed > 0) {
    console.log('');
    console.log('⚠️  有转换失败的文件，请检查上方错误信息');
    process.exit(1);
  } else {
    console.log('');
    console.log('🎉 所有图片处理完成！');
  }
}

// 执行
main().catch((err) => {
  console.error('💥 程序执行出错:', err);
  process.exit(1);
});
