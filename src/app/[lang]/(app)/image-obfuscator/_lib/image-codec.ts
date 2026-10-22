/**
 * 浏览器侧的图片编解码工具：仅使用原生 Canvas / createImageBitmap。
 * 所有像素运算都在 Worker 中完成，这里只负责“文件 ↔ ImageData ↔ Blob”。
 */
import {
  embedObfuscationMeta,
  readObfuscationMeta,
  type ObfuscationMeta,
} from '@/lib/image-obfuscator/metadata';
import type { RgbaImage } from '@/lib/image-obfuscator/types';

export type OutputFormat = 'png' | 'jpeg';

interface DecodedSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/**
 * 解码本地图片文件，优先使用 createImageBitmap（自带 EXIF 方向处理）。
 */
async function decodeSource(file: File): Promise<DecodedSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // 某些浏览器/格式不支持该选项，退回 <img>
    }
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to decode image file'));
      image.src = url;
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

function createCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D context is not available');
  }

  return { canvas, context };
}

/**
 * 只读取图片尺寸，用于上传时的体积/内存校验（避免过早分配完整像素缓冲）。
 */
export async function measureImageFile(
  file: File
): Promise<{ width: number; height: number }> {
  const decoded = await decodeSource(file);

  try {
    return { width: decoded.width, height: decoded.height };
  } finally {
    decoded.release();
  }
}

/**
 * 把文件解码成 RGBA 像素。
 */
export async function decodeImageFile(file: File): Promise<RgbaImage> {
  const decoded = await decodeSource(file);

  try {
    const { context } = createCanvas(decoded.width, decoded.height);
    context.drawImage(decoded.source, 0, 0);

    const imageData = context.getImageData(0, 0, decoded.width, decoded.height);

    return {
      width: decoded.width,
      height: decoded.height,
      data: imageData.data,
    };
  } finally {
    decoded.release();
  }
}

function containsTransparency(data: Uint8ClampedArray): boolean {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Image encoding failed'));
      },
      type,
      quality
    );
  });
}

/**
 * 把 RGBA 像素编码为 PNG / JPEG。
 * JPEG 不支持透明通道，会先合成到白色背景上，并返回是否发生过合成。
 */
export async function encodeImageData(
  image: RgbaImage,
  format: OutputFormat,
  quality: number
): Promise<{ blob: Blob; hadAlpha: boolean }> {
  const { canvas, context } = createCanvas(image.width, image.height);

  const imageData = context.createImageData(image.width, image.height);
  imageData.data.set(image.data);
  context.putImageData(imageData, 0, 0);

  return encodeCanvas(
    canvas,
    format,
    quality,
    containsTransparency(image.data)
  );
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number,
  hadAlpha: boolean
): Promise<{ blob: Blob; hadAlpha: boolean }> {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';

  if (format === 'png') {
    return { blob: await canvasToBlob(canvas, mime, 1), hadAlpha: false };
  }

  if (hadAlpha) {
    const { canvas: opaqueCanvas, context } = createCanvas(
      canvas.width,
      canvas.height
    );
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(canvas, 0, 0);

    return {
      blob: await canvasToBlob(opaqueCanvas, mime, quality),
      hadAlpha: true,
    };
  }

  return { blob: await canvasToBlob(canvas, mime, quality), hadAlpha: false };
}

/**
 * 把混淆参数写入图片元数据（PNG tEXt / JPEG XMP），失败时原样返回。
 */
export async function attachObfuscationMeta(
  blob: Blob,
  meta: ObfuscationMeta
): Promise<Blob> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const output = embedObfuscationMeta(bytes, meta);
    const buffer = output.buffer.slice(
      output.byteOffset,
      output.byteOffset + output.byteLength
    ) as ArrayBuffer;

    return new Blob([buffer], { type: blob.type });
  } catch {
    return blob;
  }
}

/**
 * 从图片文件读取混淆参数；没有元数据或字段非法时返回 null。
 */
export async function readObfuscationMetaFromFile(
  file: File
): Promise<ObfuscationMeta | null> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return readObfuscationMeta(bytes);
  } catch {
    return null;
  }
}
