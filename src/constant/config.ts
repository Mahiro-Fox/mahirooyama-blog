// 配置选项常量

// 文件大小限制 (2MB)
export const MAX_FILE_SIZE = 2 * 1024 * 1024;

// 支持的图片格式
export const SUPPORTED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

// 图片压缩配置
export const COMPRESSION_CONFIG = {
  quality: 80, // WebP 质量 0-100
  maxWidth: 1920, // 最大宽度限制
  maxHeight: 1920, // 最大高度限制
  effort: 4, // 压缩 effort (0-6, 越高越慢但更小)
};

// 重新验证路径列表
export const PATHS_TO_REVALIDATE = [
  '/', // 首页
  '/blog', // 博客列表
  '/gallery', // 画廊列表
  '/page/blog/[page]', // 博客分页
  '/page/gallery/[page]', // 画廊分页
  '/tag/blog/[slug]', // 博客标签
  '/tag/gallery/[slug]', // 画廊标签
];
