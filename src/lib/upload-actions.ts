/**
 * 通用文件上传 Action 工厂
 *
 * 将 adminUploadXXX 系列方法的通用逻辑（权限、限流、校验、存储、错误处理）
 * 抽到此处，每个 action 只需要声明差异化配置即可。
 */

import fs from 'fs/promises';
import path from 'path';
import { Permission } from '@/constant';
import { UPLOADS_DIR } from '@/constant/dir';
import { MAX_FILE_SIZE } from '@/constant/file-upload';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { checkFileConflict, ensureDirectory } from '@/utils/file-utils';
import { processAndSaveImage } from '@/lib/image-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UploadActions');

// ============================================================
// 类型定义
// ============================================================

/** 文件类型校验方式 */
type ValidationConfig =
  | { kind: 'mime'; prefix: string; label: string }
  | { kind: 'extension'; extensions: string[]; label: string };

/** 存储方式 */
type StorageConfig =
  | {
      kind: 'image';
      dir: string;
      quality?: number;
      width?: number;
      height?: number;
    }
  | {
      kind: 'raw';
      dir: string;
    };

/** 返回结构构建 */
export type ResultConfig =
  | { kind: 'image-full'; message?: string }
  | { kind: 'raw-url'; message?: string }
  | { kind: 'void' }
  | {
      kind: 'custom';
      build: (ctx: {
        url: string;
        width?: number;
        height?: number;
        file: File;
      }) => Record<string, unknown>;
    };

/** 根据 ResultConfig 推断返回数据类型（辅助类型） */
export type UploadActionResult<R extends ResultConfig | undefined> = R extends {
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
    : R extends { kind: 'void' }
      ? void
      : R extends { kind: 'custom' }
        ? ReturnType<R['build']>
        : never;

/** 工厂配置（支持泛型推断） */
export interface CreateUploadActionConfig<
  R extends ResultConfig | undefined = undefined,
> {
  /** 日志用名 */
  name: string;
  /** 所需权限 */
  permission: Permission;
  /** 限流 key 模板，支持 {userId} 占位 */
  rateLimitKey: string;
  /** FormData 字段名 */
  formField: string;
  /** 文件校验配置 */
  validation: ValidationConfig;
  /** 存储配置 */
  storage: StorageConfig;
  /** 返回结构配置 */
  result?: R;
  /** 最大文件大小，默认 MAX_FILE_SIZE */
  maxSize?: number;
  /** 存储前回调（校验通过后、存储前触发） */
  beforeStorage?: (ctx: {
    user: unknown;
    file: File;
    dir: string;
    fileName: string;
  }) => Promise<void>;
  /** 存储后回调（存储完成后触发，可用于副作用） */
  afterStorage?: (ctx: {
    user: unknown;
    file: File;
    url: string;
    width?: number;
    height?: number;
  }) => Promise<void>;
}

/** 上传结果上下文（供外部包装使用，如头像上传） */
export interface UploadResult {
  url: string;
  width?: number;
  height?: number;
  message: string;
}

// ============================================================
// 核心实现
// ============================================================

/**
 * 通用文件上传核心逻辑（不含权限/限流，可被自定义 action 直接调用）
 * @internal
 */
async function performUpload(params: {
  config: CreateUploadActionConfig<ResultConfig | undefined>;
  file: File;
  buffer: Buffer;
  user: unknown;
}): Promise<ActionResponse<UploadResult>> {
  const { config, file, buffer, user } = params;
  const maxSize = config.maxSize ?? MAX_FILE_SIZE;

  // ---- 类型校验 ----
  if (config.validation.kind === 'mime') {
    if (!file.type.startsWith(config.validation.prefix)) {
      return {
        success: false,
        error: `只允许上传${config.validation.label}文件`,
      };
    }
  } else {
    const lowerName = file.name.toLowerCase();
    const ok = config.validation.extensions.some((ext) =>
      lowerName.endsWith(ext)
    );
    if (!ok) {
      return {
        success: false,
        error: `只支持 ${config.validation.extensions.join(', ')} 格式`,
      };
    }
  }

  // ---- 大小校验 ----
  if (file.size > maxSize) {
    return {
      success: false,
      error: `${config.validation.label}大小不能超过 ${maxSize / 1024 / 1024}MB`,
    };
  }

  // ---- 计算存储路径 ----
  const fullDir = path.join(UPLOADS_DIR, config.storage.dir);
  await ensureDirectory(fullDir);

  const fileName = file.name;
  let url: string;
  let width: number | undefined;
  let height: number | undefined;
  // 文件冲突检查
  const filePath = path.join(fullDir, fileName);
  const conflict = await checkFileConflict(filePath);
  if (conflict) {
    return { success: false, error: conflict.error };
  }

  // ---- 存储前回调 ----
  if (config.beforeStorage) {
    await config.beforeStorage({
      user,
      file,
      dir: config.storage.dir,
      fileName,
    });
  }

  if (config.storage.kind === 'image') {
    // 图片处理由 processAndSaveImage 负责（自带 WebP 转换）
    // 注意：processAndSaveImage 内部使用 UPLOADS_DIR 拼接相对路径
    const result = await processAndSaveImage(buffer, {
      dir: config.storage.dir,
      fileName,
      quality: config.storage.quality ?? 50,
      width: config.storage.width,
      height: config.storage.height,
      originalMimeType: file.type,
    });
    url = result.url;
    width = result.width;
    height = result.height;
  } else {
    // 原始文件存储
    await fs.writeFile(filePath, buffer);
    url = `/uploads/${config.storage.dir}/${fileName}`.replace(/\/+/g, '/');
  }

  // ---- 存储后回调 ----
  if (config.afterStorage) {
    await config.afterStorage({ user, file, url, width, height });
  }

  // ---- 构建返回 ----
  const resultConfig = config.result;
  let msg = '';
  if (
    resultConfig &&
    resultConfig.kind !== 'void' &&
    resultConfig.kind !== 'custom'
  ) {
    msg = resultConfig.message ?? `${config.validation.label}上传成功`;
  }

  return {
    success: true,
    data: { url, width, height, message: msg },
  };
}

/**
 * 从 ActionResponse 构建最终返回数据
 * @internal
 */
function buildResultData(
  result: UploadResult,
  config: CreateUploadActionConfig<ResultConfig | undefined>
): Record<string, unknown> | undefined {
  const r = config.result ?? { kind: 'raw-url' };

  switch (r.kind) {
    case 'image-full':
      return {
        image: {
          url: result.url,
          width: result.width ?? 0,
          height: result.height ?? 0,
          ratio:
            result.width && result.height ? result.width / result.height : 1,
        },
        message: result.message,
      };
    case 'raw-url':
      return { url: result.url, message: result.message };
    case 'void':
      return undefined;
    case 'custom':
      return r.build({
        url: result.url,
        width: result.width,
        height: result.height,
        file: {} as File, // 原始 File 不在此处传递（通过 afterStorage 使用）
      });
  }
}

// ============================================================
// 对外 API
// ============================================================

/**
 * 创建一个标准的文件上传 Server Action
 *
 * @example
 * export const adminUploadBlogThumbnail = createUploadAction({
 *   name: '博客缩略图',
 *   permission: 'blog:create',
 *   rateLimitKey: 'blog:{userId}',
 *   formField: 'image',
 *   validation: { kind: 'mime', prefix: 'image/', label: '图片' },
 *   storage: { kind: 'image', dir: 'images/blog', quality: 85 },
 *   result: { kind: 'raw-url', message: '图片上传成功' },
 * });
 */
export function createUploadAction<
  R extends ResultConfig | undefined = undefined,
>(
  config: CreateUploadActionConfig<R>
): (formData: FormData) => Promise<ActionResponse<UploadActionResult<R>>> {
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
            error: `未提供${config.validation.label}文件`,
          };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadResult = await performUpload({
          config,
          file,
          buffer,
          user,
        });

        if (!uploadResult.success) {
          return uploadResult;
        }

        const data = buildResultData(uploadResult.data, config);

        logger.info(`${config.name}上传成功`, {
          fileName: file.name,
          userId: user.id,
        });

        return { success: true, data } as ActionResponse<UploadActionResult<R>>;
      } catch (error) {
        logger.error(`${config.name}上传失败`, error);
        const errorMessage =
          error instanceof Error ? error.message : '上传失败';
        return { success: false, error: errorMessage };
      }
    });
  };
}

/**
 * 独立的文件上传函数（不含权限/限流包装）
 *
 * 用于需要自定义鉴权逻辑的场景（如头像上传使用 verifyAuth）。
 * 调用方负责：鉴权 + 错误处理。
 *
 * @example
 * // 在自定义 action 中使用：
 * const auth = await verifyAuth();
 * if (!auth.success) return { success: false, error: '未登录' };
 * const result = await uploadFile(formData, config, { userId: auth.userId });
 */
export async function uploadFile<
  R extends ResultConfig | undefined = undefined,
>(
  formData: FormData,
  config: CreateUploadActionConfig<R>,
  user: unknown
): Promise<ActionResponse<UploadActionResult<R>>> {
  try {
    const file = formData.get(config.formField) as File | null;
    if (!file) {
      return {
        success: false,
        error: `未提供${config.validation.label}文件`,
      };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await performUpload({ config, file, buffer, user });
    if (!uploadResult.success) {
      return uploadResult;
    }

    const data = buildResultData(uploadResult.data, config);
    logger.info(`${config.name}上传成功`, { fileName: file.name });

    return { success: true, data } as ActionResponse<UploadActionResult<R>>;
  } catch (error) {
    logger.error(`${config.name}上传失败`, error);
    const errorMessage = error instanceof Error ? error.message : '上传失败';
    return { success: false, error: errorMessage };
  }
}
