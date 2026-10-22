/**
 * 图片混淆工具的核心类型与常量。
 * 该模块不依赖 DOM，可在 Node（测试）与 Web Worker 中运行。
 */

/** 与 ImageData 结构兼容的最小像素容器 */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export type ObfuscationMode = 'obfuscate' | 'deobfuscate';

export type EnhancementId = 'none' | 'green-boost';

export type ObfuscationStage =
  | 'derive-key'
  | 'build-curve'
  | 'permute'
  | 'enhance'
  | 'done';

export interface ObfuscationProgress {
  stage: ObfuscationStage;
  /** 总体进度 0–1 */
  ratio: number;
}

export interface ObfuscationOptions {
  /**
   * 可选密码，仅在内存中使用，不做任何持久化。
   * 留空表示无密码模式：使用固定偏移（与参考站行为一致），任何人都可还原。
   */
  password?: string;
  /** 混淆强度 0–2，默认 1；0 表示直通（像素不变） */
  strength?: number;
  /** 可配置盐，默认 DEFAULT_SALT */
  salt?: string;
  /** PBKDF2 迭代次数，默认 DEFAULT_ITERATIONS */
  iterations?: number;
  /** 算法版本，参与密钥派生 */
  version?: number;
  /** 可插拔增强层，默认 none */
  enhancement?: EnhancementId;
  /** 进度回调 */
  onProgress?: (progress: ObfuscationProgress) => void;
  /** 取消信号（核心库层面；Worker 场景由主线程 terminate） */
  signal?: AbortSignal;
}

export type ObfuscationErrorCode =
  | 'INVALID_IMAGE'
  | 'INVALID_DIMENSION'
  | 'UNSUPPORTED_SIZE'
  | 'INVALID_STRENGTH'
  | 'INSECURE_CONTEXT'
  | 'ABORTED'
  | 'INTERNAL';

export interface ObfuscationError extends Error {
  code: ObfuscationErrorCode;
}

/** 默认盐：只包含算法域信息，不包含任何用户密码 */
export const DEFAULT_SALT = 'mahiro-sfc';
export const DEFAULT_ITERATIONS = 120_000;
export const ALGORITHM_VERSION = 3;

/** 单边像素上限 */
export const MAX_SIDE = 10 * 1024;
/** 总像素上限 */
export const MAX_PIXELS = MAX_SIDE * MAX_SIDE;

export const MIN_STRENGTH = 0;
export const MAX_STRENGTH = 2;
export const DEFAULT_STRENGTH = 1;

/** 大图提示阈值（不是硬限制） */
export const LARGE_IMAGE_PIXELS = 8_000_000;

/**
 * 创建一个带机器码的错误对象（保持函数式，不使用自定义 class）。
 */
export function createObfuscationError(
  code: ObfuscationErrorCode,
  message: string
): ObfuscationError {
  const error = new Error(message) as ObfuscationError;
  error.code = code;
  return error;
}

/**
 * 判断任意错误是否为本模块定义的错误。
 */
export function isObfuscationError(error: unknown): error is ObfuscationError {
  return (
    error instanceof Error &&
    typeof (error as ObfuscationError).code === 'string'
  );
}
