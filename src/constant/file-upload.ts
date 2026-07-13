// 文件上传限制常量

// 单个文件最大大小 (20MB)
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 总文件大小最大限制 (100MB)
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

// 最大文件数量
export const MAX_FILES_COUNT = 20;

// 允许的MIME类型
export const ALLOWED_MIME_TYPES = [
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  // 视频
  'video/mp4',
  'video/webm',
  // 音频
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // 文档
  'application/pdf',
  // 压缩包
  'application/zip',
  'application/x-rar-compressed',
];

// WebP转换质量 (可通过环境变量配置, 默认50)
export const WEBP_QUALITY = Number(process.env.WEBP_QUALITY || 50);
