/**
 * 批量混淆图片脚本。
 *
 * 用法：
 *   pnpm obfuscate <输入目录> <输出目录> [选项]
 *
 * 选项：
 *   --password <密码>   密码（默认空；空密码使用固定偏移，任何人都能还原）
 *   --strength <0-2>    混淆强度（默认 1）
 *   --format <png|jpeg> 输出格式（默认 jpeg）
 *   --quality <1-100>   JPEG 质量（默认 85）
 *   --enhance           开启绿图增强（默认关闭）
 *   --flat              只处理输入目录顶层，不递归子目录
 *   --force             覆盖输出目录中已存在的同名文件
 *
 * 只处理 png / jpg / jpeg；webp 等其他格式直接跳过。
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { obfuscateImageData } from '@/lib/image-obfuscator';
import { embedObfuscationMeta } from '@/lib/image-obfuscator/metadata';
import {
  ALGORITHM_VERSION,
  MAX_PIXELS,
  MAX_SIDE,
  MAX_STRENGTH,
  MIN_STRENGTH,
  type RgbaImage,
} from '@/lib/image-obfuscator/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const INPUT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const OUTPUT_EXTENSION = { png: '.png', jpeg: '.jpg' } as const;

type OutputFormat = keyof typeof OUTPUT_EXTENSION;

interface CliOptions {
  inputDir: string;
  outputDir: string;
  password: string;
  strength: number;
  format: OutputFormat;
  /** 1–100 */
  quality: number;
  enhance: boolean;
  recursive: boolean;
  force: boolean;
}

const DEFAULTS = {
  password: '',
  strength: 1,
  format: 'jpeg' as OutputFormat,
  quality: 85,
  enhance: false,
  recursive: true,
  force: false,
};

function printUsage(): void {
  console.log(
    [
      '用法：pnpm obfuscate <输入目录> <输出目录> [选项]',
      '',
      '选项：',
      '  --password <密码>    密码（默认空；空密码使用固定偏移，任何人都能还原）',
      '  --strength <0-2>     混淆强度（默认 1）',
      '  --format <png|jpeg>  输出格式（默认 jpeg）',
      '  --quality <1-100>    JPEG 质量（默认 85）',
      '  --enhance            开启绿图增强（默认关闭）',
      '  --flat               只处理顶层目录，不递归',
      '  --force              覆盖已存在的输出文件',
      '',
      '只处理 png / jpg / jpeg，webp 等格式会被跳过。',
    ].join('\n')
  );
}

function parseNumber(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`选项 ${name} 需要一个数字，收到：${value ?? '空'}`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions | null {
  const positional: string[] = [];
  const options: CliOptions = {
    inputDir: '',
    outputDir: '',
    ...DEFAULTS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        return null;
      case '--password':
        options.password = argv[index + 1] ?? '';
        index += 1;
        break;
      case '--strength':
        options.strength = parseNumber(argv[index + 1], '--strength');
        index += 1;
        break;
      case '--format': {
        const value = (argv[index + 1] ?? '').toLowerCase();
        if (value !== 'png' && value !== 'jpeg') {
          throw new Error(`--format 只支持 png 或 jpeg，收到：${value}`);
        }
        options.format = value;
        index += 1;
        break;
      }
      case '--quality':
        options.quality = parseNumber(argv[index + 1], '--quality');
        index += 1;
        break;
      case '--enhance':
        options.enhance = true;
        break;
      case '--flat':
        options.recursive = false;
        break;
      case '--force':
        options.force = true;
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`未知选项：${arg}`);
        }
        positional.push(arg);
    }
  }

  if (positional.length < 2) {
    throw new Error('需要同时提供输入目录与输出目录');
  }

  if (options.strength < MIN_STRENGTH || options.strength > MAX_STRENGTH) {
    throw new Error(`--strength 需在 ${MIN_STRENGTH}–${MAX_STRENGTH} 之间`);
  }

  if (options.quality < 1 || options.quality > 100) {
    throw new Error('--quality 需在 1–100 之间');
  }

  return {
    ...options,
    inputDir: path.resolve(ROOT_DIR, positional[0]),
    outputDir: path.resolve(ROOT_DIR, positional[1]),
  };
}

/**
 * 收集待处理文件：只保留 png/jpg/jpeg，跳过隐藏文件与已有输出目录。
 */
async function collectFiles(
  dir: string,
  recursive: boolean,
  skipDir?: string
): Promise<{ files: string[]; skipped: string[] }> {
  const files: string[] = [];
  const skipped: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!recursive) continue;
      if (skipDir && path.resolve(fullPath) === path.resolve(skipDir)) continue;

      const nested = await collectFiles(fullPath, recursive, skipDir);
      files.push(...nested.files);
      skipped.push(...nested.skipped);
      continue;
    }

    if (entry.name.startsWith('.')) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (INPUT_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    } else if (ext === '.webp') {
      skipped.push(fullPath);
    }
  }

  return { files: files.sort(), skipped };
}

/**
 * 用 sharp 解码为 RGBA：先按 EXIF 方向旋转，再统一补 alpha 通道。
 * 输出 JPEG 时先合成到白底，避免透明像素在混淆后被撕成白色麻点。
 */
async function decodeToRgba(
  filePath: string,
  flatten: boolean
): Promise<{ image: RgbaImage; width: number; height: number }> {
  const { default: sharp } = await import('sharp');
  const base = sharp(filePath).rotate();
  const prepared = flatten ? base.flatten({ background: '#ffffff' }) : base;
  const { data, info } = await prepared
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  // ensureAlpha 之后应为 4 通道；若 sharp 仍返回 3 通道则手动补齐
  const rgba = new Uint8ClampedArray(info.width * info.height * 4);

  if (channels === 4) {
    rgba.set(data);
  } else {
    for (let index = 0; index < info.width * info.height; index += 1) {
      rgba[index * 4] = data[index * channels];
      rgba[index * 4 + 1] = data[index * channels + 1];
      rgba[index * 4 + 2] = data[index * channels + 2];
      rgba[index * 4 + 3] = 255;
    }
  }

  return {
    image: { width: info.width, height: info.height, data: rgba },
    width: info.width,
    height: info.height,
  };
}

/**
 * 编码并写入元数据；JPEG 不支持透明通道，先合成到白底。
 */
async function encodeWithMeta(
  image: RgbaImage,
  format: OutputFormat,
  quality: number,
  meta: {
    version: number;
    strength: number;
    enhancement: 'none' | 'green-boost';
    format: OutputFormat;
    quality: number;
  }
): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  const pipeline = sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
  });

  const encoded =
    format === 'png'
      ? await pipeline.png().toBuffer()
      : await pipeline
          .flatten({ background: '#ffffff' })
          .jpeg({ quality })
          .toBuffer();

  const withMeta = embedObfuscationMeta(new Uint8Array(encoded), meta);
  return Buffer.from(withMeta);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function processFile(
  sourcePath: string,
  targetPath: string,
  options: CliOptions
): Promise<'done' | 'skipped'> {
  const sourceStats = await fs.stat(sourcePath);
  const { image, width, height } = await decodeToRgba(
    sourcePath,
    options.format === 'jpeg'
  );

  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_PIXELS) {
    throw new Error(
      `尺寸超出上限 ${width}×${height}（单边 ≤ ${MAX_SIDE}，总像素 ≤ ${MAX_PIXELS}）`
    );
  }

  const enhancement = options.enhance ? 'green-boost' : 'none';
  const obfuscated = await obfuscateImageData(image, {
    password: options.password,
    strength: options.strength,
    enhancement,
  });

  const output = await encodeWithMeta(
    obfuscated,
    options.format,
    options.quality,
    {
      version: ALGORITHM_VERSION,
      strength: options.strength,
      enhancement,
      format: options.format,
      // 元数据中的质量统一为 0–1
      quality: options.format === 'jpeg' ? options.quality / 100 : 1,
    }
  );

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, output);

  console.log(
    `   ${width}×${height} · ${formatSize(sourceStats.size)} → ${formatSize(output.length)}`
  );

  return 'done';
}

async function main(): Promise<void> {
  let options: CliOptions | null;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`);
    printUsage();
    process.exit(1);
  }

  if (!options) {
    printUsage();
    return;
  }

  const { inputDir, outputDir } = options;

  try {
    const stats = await fs.stat(inputDir);
    if (!stats.isDirectory()) throw new Error('不是目录');
  } catch {
    console.error(`❌ 输入目录不存在或不可读：${inputDir}`);
    process.exit(1);
  }

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    console.error('❌ 当前 Node 版本缺少 Web Crypto（需要 Node 20+）');
    process.exit(1);
  }

  console.log('🚀 开始批量混淆');
  console.log(`📁 输入：${inputDir}`);
  console.log(`📁 输出：${outputDir}`);
  console.log(
    `⚙️  密码：${options.password ? '已设置' : '空'} · 强度：${options.strength} · 增强：${
      options.enhance ? '开启' : '关闭'
    } · 格式：${options.format.toUpperCase()}${
      options.format === 'jpeg' ? ` ${options.quality}%` : ''
    }`
  );

  const { files, skipped } = await collectFiles(
    inputDir,
    options.recursive,
    outputDir
  );

  if (skipped.length > 0) {
    console.log('');
    console.log(
      `⏭️  跳过 ${skipped.length} 个不支持的文件（仅支持 png/jpg/jpeg）：`
    );
    for (const file of skipped) {
      console.log(`   - ${path.relative(inputDir, file)}`);
    }
  }

  if (files.length === 0) {
    console.log('');
    console.log('没有需要处理的图片。');
    return;
  }

  console.log('');
  console.log(`共 ${files.length} 张图片待处理`);
  console.log('');

  const success: string[] = [];
  const failed: { file: string; reason: string }[] = [];
  const startTime = Date.now();

  for (const [index, file] of files.entries()) {
    const relative = path.relative(inputDir, file);
    const baseName = path.parse(file).name;
    const targetPath = path.join(
      outputDir,
      path.dirname(relative),
      baseName + OUTPUT_EXTENSION[options.format]
    );

    const label = `[${index + 1}/${files.length}] ${relative}`;
    console.log(`🖼️  ${label}`);

    if (!options.force) {
      try {
        await fs.access(targetPath);
        console.log(
          `   ⏭️  已存在，跳过：${path.relative(outputDir, targetPath)}`
        );
        skipped.push(file);
        continue;
      } catch {
        // 输出不存在，继续处理
      }
    }

    try {
      await processFile(file, targetPath, options);
      console.log(`   ✅ ${path.relative(outputDir, targetPath)}`);
      success.push(relative);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ ${reason}`);
      failed.push({ file: relative, reason });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('');
  console.log('📊 统计');
  console.log(`   成功：${success.length}`);
  console.log(`   跳过：${skipped.length}`);
  console.log(`   失败：${failed.length}`);
  console.log(`   耗时：${duration}s`);

  if (failed.length > 0) {
    console.log('');
    console.log('⚠️  失败清单：');
    for (const item of failed) {
      console.log(`   - ${item.file}：${item.reason}`);
    }
    process.exit(1);
  }

  console.log('');
  console.log('🎉 全部处理完成');
}

main().catch((error) => {
  console.error('💥 程序执行出错:', error);
  process.exit(1);
});
