import { Permission } from '@/constant';
import sharp from 'sharp';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { goUploadMultipart } from '@/lib/server/api-client';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UploadActions');

// ============================================================
// Go 后端转发上传
// 说明：上传落盘逻辑已迁移至 Go 后端（/api/uploads/asset）。
// Next 侧仅保留：权限校验 + 限流 + sharp 图片处理（转 WebP/取尺寸），
// 然后通过 goUploadMultipart 将二进制数据与 dir/width/height 转发给 Go。
// ============================================================

/** 转发到 Go 的上传结果返回结构 */
type GoUploadResultConfig =
  | {
      kind: 'raw-url';
      message?: string;
    }
  | {
      kind: 'image-full';
      message?: string;
    };

/** 根据 GoUploadResultConfig 推断返回数据类型 */
export type GoUploadActionResult<R extends GoUploadResultConfig> = R extends {
  kind: 'image-full';
}
  ? {
      image: {
        url: string;
        width: number;
        height: number;
        ratio: number;
      };
      message: string;
    }
  : R extends { kind: 'raw-url' }
    ? { url: string; message: string }
    : never;

/** Go 转发上传工厂配置 */
export interface GoUploadActionConfig<R extends GoUploadResultConfig> {
  /** 日志用名 */
  name: string;
  /** 所需权限 */
  permission: Permission;
  /** 限流 key 模板，支持 {userId} 占位 */
  rateLimitKey: string;
  /** FormData 字段名 */
  formField: string;
  /** 校验时的标签（用于错误提示） */
  label: string;
  /** Go 端存储的子目录（相对 uploads 根目录），如 images/blog */
  dir: string;
  /** 上传处理类型：image 走 sharp 转 WebP；raw 原样转发 */
  target: 'image' | 'raw';
  /** 图片质量（仅 target=image，默认 50） */
  quality?: number;
  /** 返回结构配置 */
  result: R;
  /** 视频/音频等非图片的 MIME 前缀（仅 target=raw 用于类型提示，校验由 Go 负责） */
  mimePrefix?: string;
}

/**
 * 创建一个转发到 Go 后端的上传 Server Action
 *
 * 保持统一的权限 + 限流封装，但存储交由 Go 完成。
 * 图片会被 sharp 处理后以 WebP 形式转发（同时保留源文件、携带 width/height）；
 * 其他文件（音频等）原样转发。
 */

/**
 * 将单个文件附加到 /uploads/asset 的 FormData（一次请求一个 file）。
 *
 * 图片按 processAndSaveImage 语义处理：
 * - WebP：不压缩，原样作为 file 保存一份；
 * - 非 WebP：转 WebP 作为 file，同时把源文件附带为 originalFile，Go 一并落盘；
 * 非图片：原样作为 file。
 *
 * 纯函数，只依赖入参，无外部副作用。
 */
export async function appendGoAssetFile(
  formData: FormData,
  file: File,
  opts: { dir: string; quality?: number }
): Promise<{ width: number; height: number }> {
  const quality = opts.quality ?? 50;
  const isImage = file.type.startsWith('image/');
  let width = 0;
  let height = 0;

  if (isImage) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const isWebp =
      file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

    if (isWebp) {
      const meta = await sharp(buffer).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
      formData.append('file', file, file.name);
    } else {
      const processed = await sharp(buffer).webp({ quality }).toBuffer();
      const meta = await sharp(processed).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;

      const baseName = file.name.replace(/\.[^/.]+$/, '') || 'upload';
      const webpName = `${baseName}.webp`;
      formData.append(
        'file',
        new Blob([new Uint8Array(processed)], { type: 'image/webp' }),
        webpName
      );
      // 源文件保留原名附带，Go 一并落盘
      formData.append('originalFile', file, file.name);
    }
  } else {
    formData.append('file', file, file.name);
  }

  if (opts.dir) {
    formData.append('dir', opts.dir);
  }
  formData.append('width', String(width));
  formData.append('height', String(height));

  return { width, height };
}

export function createGoUploadAction<R extends GoUploadResultConfig>(
  config: GoUploadActionConfig<R>
): (formData: FormData) => Promise<ActionResponse<GoUploadActionResult<R>>> {
  return async (formData: FormData) => {
    return withActionPermission(config.permission, async (user) => {
      // ---- 限流检查 ----
      const key = config.rateLimitKey.replace('{userId}', String(user.id));
      if (user.id) {
        const rateLimit = await serverActionRateLimiter.check(key);
        if (!rateLimit.success) {
          return {
            success: false,
            error: '操作过于频繁，请稍后再试',
            resetTime: rateLimit.resetTime,
          };
        }
      }

      try {
        // ---- 解析文件 ----
        const file = formData.get(config.formField) as File | null;
        if (!file) {
          return {
            success: false,
            error: `未提供${config.label}文件`,
          };
        }

        // ---- 构造转发 FormData（图片转 WebP 并保留源文件）----
        const goFormData = new FormData();
        const { width, height } = await appendGoAssetFile(goFormData, file, {
          dir: config.dir,
          quality: config.quality,
        });

        // ---- 转发到 Go ----
        const data = await goUploadMultipart<{
          url: string;
          width: number;
          height: number;
        }>('/api/uploads/asset', goFormData);

        // ---- 构建返回 ----
        const msg = config.result.message ?? `${config.label}上传成功`;

        if (config.result.kind === 'image-full') {
          const w = data.width || width;
          const h = data.height || height;
          const resultData = {
            image: {
              url: data.url,
              width: w,
              height: h,
              ratio: w && h ? w / h : 1,
            },
            message: msg,
          } as GoUploadActionResult<R>;
          logger.info(`${config.name}上传成功`, {
            fileName: file.name,
            userId: user.id,
          });
          return { success: true, data: resultData };
        }

        const resultData = {
          url: data.url,
          message: msg,
        } as GoUploadActionResult<R>;
        logger.info(`${config.name}上传成功`, {
          fileName: file.name,
          userId: user.id,
        });
        return { success: true, data: resultData };
      } catch (error) {
        logger.error(`${config.name}上传失败`, error);
        const errorMessage =
          error instanceof Error ? error.message : '上传失败';
        return { success: false, error: errorMessage };
      }
    });
  };
}
