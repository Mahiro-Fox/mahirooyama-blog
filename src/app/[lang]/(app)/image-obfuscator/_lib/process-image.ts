/**
 * 单张图片的完整处理链路：解码 → Worker 混淆/还原 → 编码 → 写入参数元数据。
 * 批量队列会逐张调用这里，保证内存中只保留一张图片的像素缓冲。
 */
import {
  ALGORITHM_VERSION,
  type EnhancementId,
  type ObfuscationMode,
  type RgbaImage,
} from "@/lib/image-obfuscator/types";
import {
  attachObfuscationMeta,
  decodeImageFile,
  encodeImageData,
  type OutputFormat,
} from "./image-codec";
import type { ResultImage } from "./types";

export interface ProcessingSettings {
  mode: ObfuscationMode;
  password: string;
  strength: number;
  enhancement: EnhancementId;
  format: OutputFormat;
  quality: number;
}

export interface ProcessRunnerInput {
  image: RgbaImage;
  mode: ObfuscationMode;
  password: string;
  strength: number;
  enhancement: EnhancementId;
}

export type ProcessRunner = (input: ProcessRunnerInput) => Promise<RgbaImage>;

/** 尚未创建预览地址的处理结果 */
export type ProcessedImage = Omit<ResultImage, "url">;

export async function processImageFile(
  file: File,
  settings: ProcessingSettings,
  runner: ProcessRunner,
): Promise<ProcessedImage> {
  const decoded = await decodeImageFile(file);
  const processed = await runner({
    image: decoded,
    mode: settings.mode,
    password: settings.password,
    strength: settings.strength,
    enhancement: settings.enhancement,
  });

  const encoded = await encodeImageData(
    processed,
    settings.format,
    settings.quality,
  );

  const blob =
    settings.mode === "obfuscate"
      ? await attachObfuscationMeta(encoded.blob, {
          version: ALGORITHM_VERSION,
          strength: settings.strength,
          enhancement: settings.enhancement,
          format: settings.format,
          quality: settings.quality,
        })
      : encoded.blob;

  return {
    blob,
    format: settings.format,
    width: processed.width,
    height: processed.height,
    mode: settings.mode,
    hadAlpha: encoded.hadAlpha,
  };
}
