import type { ObfuscationMeta } from "@/lib/image-obfuscator/metadata";
import type { ObfuscationStage } from "@/lib/image-obfuscator/types";
import type { OutputFormat } from "./image-codec";

export type ImageItemStatus = "pending" | "running" | "done" | "error";

export interface ResultImage {
  url: string;
  blob: Blob;
  format: OutputFormat;
  width: number;
  height: number;
  mode: "obfuscate" | "deobfuscate";
  hadAlpha: boolean;
}

/** 批量列表中的一张图片及其处理状态 */
export interface ImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
  /** 导入时从图片元数据解析出的混淆参数 */
  meta: ObfuscationMeta | null;
  status: ImageItemStatus;
  progress: number;
  stage: ObfuscationStage;
  result: ResultImage | null;
  errorKey: string | null;
  sizeNotice: string | null;
}
