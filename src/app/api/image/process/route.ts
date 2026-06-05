import { NextRequest, NextResponse } from 'next/server';

import {
  bufferToBase64,
  getMimeType,
  ImageProcessOptions,
  ProcessedImageMetadata,
  processImagesGenerator,
} from '@/lib/image-processor';

/**
 * 单张图片处理结果
 */
interface SingleImageResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
  /** 错误代码（如果失败） */
  errorCode?: string;
  /** 处理后的图片元数据（如果成功） */
  metadata?: ProcessedImageMetadata;
  /** Base64 编码的图片数据（如果成功） */
  base64?: string;
  /** 原始文件名（如果提供） */
  originalName?: string;
}

/**
 * API 响应类型
 */
interface ProcessImageResponse {
  /** 是否成功 */
  success: boolean;
  /** 处理结果数组（支持批量处理） */
  results: SingleImageResult[];
  /** 总处理数量 */
  total: number;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 错误信息（如果有全局错误） */
  error?: string;
}

import { MAX_FILE_SIZE } from '@/constant/file-upload';

/**
 * 默认图片处理配置
 */
const DEFAULT_OPTIONS: ImageProcessOptions = {
  targetFormat: 'webp',
  quality: 80,
  keepMetadata: false,
  convertAnimation: false,
};

/**
 * POST /api/image/process
 *
 * 接收 multipart/form-data 表单数据，处理单张或多张图片
 *
 * 请求格式：
 * - Content-Type: multipart/form-data
 * - files: 图片文件（支持多张）
 * - options: JSON 字符串格式的配置选项（可选）
 *
 * 响应格式：
 * - Content-Type: application/json
 * - 返回处理结果数组，包含每张图片的处理状态、元数据和 Base64 数据
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ProcessImageResponse>> {
  try {
    // 解析 multipart/form-data
    const formData = await request.formData();

    // 提取上传的文件
    const files: File[] = [];
    formData.forEach((value, key) => {
      if (key === 'files' || key.startsWith('file')) {
        if (value instanceof File) {
          files.push(value);
        }
      }
    });

    // 验证是否有文件上传
    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          results: [],
          total: 0,
          successCount: 0,
          failureCount: 0,
          error: '未检测到上传的图片文件',
        },
        { status: 400 }
      );
    }

    // 提取配置选项
    let options: ImageProcessOptions = DEFAULT_OPTIONS;
    const optionsString = formData.get('options') as string | null;

    if (optionsString) {
      try {
        const parsedOptions = JSON.parse(
          optionsString
        ) as Partial<ImageProcessOptions>;
        // 合并默认配置和用户配置
        options = {
          ...DEFAULT_OPTIONS,
          ...parsedOptions,
        };
      } catch {
        return NextResponse.json(
          {
            success: false,
            results: [],
            total: 0,
            successCount: 0,
            failureCount: 0,
            error: '配置选项 JSON 格式错误',
          },
          { status: 400 }
        );
      }
    }

    // 验证配置选项
    if (
      !options.targetFormat ||
      !['webp', 'png', 'jpeg', 'avif'].includes(options.targetFormat)
    ) {
      return NextResponse.json(
        {
          success: false,
          results: [],
          total: 0,
          successCount: 0,
          failureCount: 0,
          error: '不支持的目标格式，请使用 webp、png、jpeg 或 avif',
        },
        { status: 400 }
      );
    }

    if (options.quality < 1 || options.quality > 100) {
      return NextResponse.json(
        {
          success: false,
          results: [],
          total: 0,
          successCount: 0,
          failureCount: 0,
          error: '质量参数必须在 1-100 之间',
        },
        { status: 400 }
      );
    }

    // 检查文件大小
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            results: [],
            total: 0,
            successCount: 0,
            failureCount: 0,
            error: `文件 ${file.name} 超过 20MB 限制`,
          },
          { status: 400 }
        );
      }
    }

    // 将 File 对象转换为 Buffer 数组
    const imageBuffers: Buffer[] = [];
    const fileNames: string[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBuffers.push(buffer);
      fileNames.push(file.name);
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始信号
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: 'start', total: files.length }) + '\n'
            )
          );

          // 批量处理图片（生成器模式）
          for await (const { index, result } of processImagesGenerator(
            imageBuffers,
            options
          )) {
            const originalName = fileNames[index] || `image_${index + 1}`;
            let finalResult: SingleImageResult;

            if (
              result.metadata.format === 'error' ||
              result.buffer.length === 0
            ) {
              finalResult = {
                success: false,
                error: '图片处理失败',
                errorCode: 'PROCESSING_FAILED',
                originalName,
              };
            } else {
              const mimeType = getMimeType(options.targetFormat);
              const base64 = bufferToBase64(result.buffer, mimeType);
              finalResult = {
                success: true,
                metadata: result.metadata,
                base64,
                originalName,
              };
            }

            // 发送单条结果
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'result', index, result: finalResult }) +
                  '\n'
              )
            );
          }

          // 发送完成信号
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'done' }) + '\n')
          );
          controller.close();
        } catch (error) {
          console.error('流式处理错误:', error);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'error',
                error:
                  error instanceof Error ? error.message : '处理过程中出错',
              }) + '\n'
            )
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    // 处理未知错误
    console.error('图片处理 API 错误:', error);

    return NextResponse.json(
      {
        success: false,
        results: [],
        total: 0,
        successCount: 0,
        failureCount: 0,
        error: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/image/process
 *
 * 返回 API 使用说明
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: '图片处理 API',
    method: 'POST',
    contentType: 'multipart/form-data',
    description: '上传图片并处理（压缩、转换格式、调整尺寸等）',
    parameters: {
      files: '图片文件（支持多张，字段名为 files 或 file）',
      options: 'JSON 字符串格式的配置选项（可选）',
    },
    optionsSchema: {
      targetFormat: '目标格式：webp | png | jpeg | avif',
      quality: '压缩质量：1-100（针对 webp、jpeg、avif）',
      keepMetadata: '是否保留 EXIF 元数据：true | false',
      resize: {
        width: '目标宽度（像素，可选）',
        height: '目标高度（像素，可选）',
        fit: '适配模式：cover | contain | inside（可选，默认 cover）',
      },
      convertAnimation: '是否转换动图为动态 WebP/AVIF：true | false',
    },
    example: {
      files: ['image1.jpg', 'image2.png'],
      options: JSON.stringify({
        targetFormat: 'webp',
        quality: 80,
        keepMetadata: false,
        resize: { width: 1920, height: 1080, fit: 'cover' },
        convertAnimation: false,
      }),
    },
    response: {
      success: 'boolean',
      results: [
        {
          success: 'boolean',
          metadata: {
            width: 'number',
            height: 'number',
            format: 'string',
            size: 'number',
            isAnimated: 'boolean',
          },
          base64: 'string (data URI)',
          originalName: 'string',
        },
      ],
      total: 'number',
      successCount: 'number',
      failureCount: 'number',
    },
  });
}
