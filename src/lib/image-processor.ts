import sharp, { Metadata, Sharp } from 'sharp';

/**
 * 支持的目标图片格式
 */
export type TargetFormat = 'webp' | 'png' | 'jpeg' | 'avif';

/**
 * 调整尺寸时的适配模式
 * - cover: 裁剪以填充指定尺寸（类似 CSS object-fit: cover）
 * - contain: 保持比例，完整显示在指定尺寸内（类似 CSS object-fit: contain）
 * - inside: 缩放以适应指定尺寸，不会放大（类似 CSS object-fit: scale-down）
 */
export type ResizeFit = 'cover' | 'contain' | 'inside';

/**
 * 调整尺寸配置
 */
export interface ResizeOptions {
  /** 目标宽度（像素） */
  width?: number;
  /** 目标高度（像素） */
  height?: number;
  /** 适配模式，默认为 'cover' */
  fit?: ResizeFit;
}

/**
 * 图片处理选项配置
 */
export interface ImageProcessOptions {
  /** 目标格式，支持 webp、png、jpeg、avif */
  targetFormat: TargetFormat;
  /** 压缩质量，1-100 的数字（针对 webp、jpeg、avif 有效） */
  quality: number;
  /** 是否保留 EXIF 元数据，false 时会清除元数据以保护隐私并减小体积 */
  keepMetadata: boolean;
  /** 调整尺寸配置（可选） */
  resize?: ResizeOptions;
  /** 如果输入是 GIF 或动图，是否转换为动态的 WebP/AVIF */
  convertAnimation: boolean;
}

/**
 * 图片处理结果
 */
export interface ImageProcessResult {
  /** 处理后的图片 Buffer */
  buffer: Buffer;
  /** 处理后的图片元数据 */
  metadata: ProcessedImageMetadata;
}

/**
 * 处理后的图片元数据
 */
export interface ProcessedImageMetadata {
  /** 图片宽度（像素） */
  width: number;
  /** 图片高度（像素） */
  height: number;
  /** 图片格式 */
  format: string;
  /** 文件大小（字节） */
  size: number;
  /** 是否为动图 */
  isAnimated: boolean;
}

/**
 * 图片处理错误
 */
export class ImageProcessError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ImageProcessError';
  }
}

/**
 * 核心图片处理函数
 * 
 * @param imageBuffer - 输入的图片 Buffer
 * @param options - 图片处理配置选项
 * @returns Promise<ImageProcessResult> - 处理结果，包含 Buffer 和元数据
 * @throws ImageProcessError - 当图片处理失败时抛出
 */
export async function processImageBuffer(
  imageBuffer: Buffer,
  options: ImageProcessOptions
): Promise<ImageProcessResult> {
  try {
    // 验证输入参数
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      throw new ImageProcessError('输入的图片 Buffer 无效', 'INVALID_BUFFER');
    }

    if (imageBuffer.length > 20 * 1024 * 1024) {
      throw new ImageProcessError('图片大小超过 20MB 限制', 'FILE_TOO_LARGE');
    }

    // 验证质量参数范围
    if (options.quality < 1 || options.quality > 100) {
      throw new ImageProcessError('质量参数必须在 1-100 之间', 'INVALID_QUALITY');
    }

    // 创建 Sharp 实例，根据是否需要动画处理设置 animated 选项
    const sharpInstance: Sharp = sharp(imageBuffer, {
      animated: options.convertAnimation,
    });

    // 获取原始图片元数据
    const originalMetadata: Metadata = await sharpInstance.metadata();

    // 检查是否为支持的图片格式
    if (!originalMetadata.format) {
      throw new ImageProcessError('无法识别图片格式', 'UNSUPPORTED_FORMAT');
    }

    // 构建处理链
    let processor: Sharp = sharpInstance;

    // 1. 调整尺寸（如果配置了 resize 选项）
    if (options.resize && (options.resize.width || options.resize.height)) {
      processor = processor.resize({
        width: options.resize.width,
        height: options.resize.height,
        fit: options.resize.fit || 'cover',
        // 不进行放大，避免图片质量下降
        withoutEnlargement: true,
      });
    }

    // 2. 自动旋转图片（根据 EXIF 方向信息）
    // rotate() 会自动读取 EXIF 的 Orientation 标签并旋转图片
    processor = processor.rotate();

    // 3. 元数据处理
    // 如果不保留元数据，调用 withMetadata() 的反向操作
    // sharp 默认会保留部分元数据，我们需要明确清除
    if (!options.keepMetadata) {
      // withMetadata({}) 会清除大部分元数据，只保留基本的图片信息
      processor = processor.withMetadata({});
    } else {
      // 保留元数据，但仍然会自动处理 EXIF 方向
      processor = processor.withMetadata();
    }

    // 4. 根据目标格式进行转换和压缩
    switch (options.targetFormat) {
      case 'webp':
        // webp 格式：quality 参数控制压缩质量
        // effort 参数控制编码速度与质量平衡（0-6，默认 4）
        // 注意：WebP 在 quality 接近 100 时可能会导致文件变大，因此限制最大质量为 95
        processor = processor.webp({
          quality: Math.min(options.quality, 95),
          effort: 4,
        });
        break;

      case 'jpeg':
        // jpeg 格式：quality 参数控制压缩质量
        // progressive: true 启用渐进式 JPEG，提升加载体验
        processor = processor.jpeg({
          quality: options.quality,
          progressive: true,
        });
        break;

      case 'png':
        // png 格式：quality 参数控制压缩级别（0-9）
        // 注意：PNG 是无损格式，这里的 quality 实际上是压缩速度与压缩率的平衡
        // adaptiveFilter: true 启用自适应过滤，提升压缩效果
        processor = processor.png({
          quality: Math.min(options.quality, 100),
          adaptiveFiltering: true,
        });
        break;

      case 'avif':
        // avif 格式：quality 参数控制压缩质量
        // effort 参数控制编码速度与质量平衡（0-9，默认 4）
        // lossless: false 启用有损压缩以获得更好的压缩率
        processor = processor.avif({
          quality: options.quality,
          effort: 4,
          lossless: false,
        });
        break;

      default:
        throw new ImageProcessError(
          `不支持的目标格式: ${options.targetFormat}`,
          'UNSUPPORTED_TARGET_FORMAT'
        );
    }

    // 执行处理并获取 Buffer
    const processedBuffer: Buffer = await processor.toBuffer();

    // 获取处理后的元数据
    const processedMetadata: Metadata = await sharp(processedBuffer).metadata();

    // 构建返回的元数据对象
    const resultMetadata: ProcessedImageMetadata = {
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
      format: processedMetadata.format || options.targetFormat,
      size: processedBuffer.length,
      isAnimated: processedMetadata.pages !== undefined && processedMetadata.pages > 1,
    };

    return {
      buffer: processedBuffer,
      metadata: resultMetadata,
    };
  } catch (error) {
    // 如果是已知的 ImageProcessError，直接抛出
    if (error instanceof ImageProcessError) {
      throw error;
    }

    // 处理 Sharp 库抛出的错误
    if (error instanceof Error) {
      // 检查是否是格式不支持错误
      if (error.message.includes('Unsupported') || error.message.includes('format')) {
        throw new ImageProcessError(
          `不支持的图片格式: ${error.message}`,
          'UNSUPPORTED_FORMAT'
        );
      }

      // 检查是否是图片损坏错误
      if (error.message.includes('corrupt') || error.message.includes('invalid')) {
        throw new ImageProcessError(
          '图片文件已损坏或无效',
          'CORRUPTED_IMAGE'
        );
      }

      // 其他未知错误
      throw new ImageProcessError(
        `图片处理失败: ${error.message}`,
        'PROCESSING_FAILED'
      );
    }

    // 未知错误类型
    throw new ImageProcessError(
      '图片处理时发生未知错误',
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * 批量处理多张图片
 * 
 * @param imageBuffers - 图片 Buffer 数组
 * @param options - 图片处理配置选项（所有图片使用相同配置）
 * @returns Promise<ImageProcessResult[]> - 处理结果数组
 */
export async function processMultipleImages(
  imageBuffers: Buffer[],
  options: ImageProcessOptions
): Promise<ImageProcessResult[]> {
  const results: ImageProcessResult[] = [];

  for (let i = 0; i < imageBuffers.length; i++) {
    try {
      const result = await processImageBuffer(imageBuffers[i], options);
      results.push(result);
    } catch (error) {
      // 单张图片处理失败不影响其他图片
      // 将错误信息作为特殊结果返回
      results.push({
        buffer: Buffer.alloc(0),
        metadata: {
          width: 0,
          height: 0,
          format: 'error',
          size: 0,
          isAnimated: false,
        },
      });
    }
  }

  return results;
}

/**
 * 将 Buffer 转换为 Base64 字符串（用于前端预览）
 * 
 * @param buffer - 图片 Buffer
 * @param mimeType - MIME 类型（如 'image/webp'）
 * @returns Base64 数据 URI
 */
export function bufferToBase64(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * 根据格式获取对应的 MIME 类型
 * 
 * @param format - 图片格式
 * @returns MIME 类型字符串
 */
export function getMimeType(format: TargetFormat): string {
  const mimeTypes: Record<TargetFormat, string> = {
    webp: 'image/webp',
    png: 'image/png',
    jpeg: 'image/jpeg',
    avif: 'image/avif',
  };
  return mimeTypes[format];
}
