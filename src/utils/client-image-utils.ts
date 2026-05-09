/**
 * 客户端图片工具函数
 * 这些函数在服务端和客户端都可以运行
 */

/**
 * 判断是否为外部图片 URL
 */
export function isExternalImage(src: string): boolean {
  return src.startsWith('http') || src.startsWith('data:');
}

/**
 * 判断是否为 API 路由路径
 */
export function isApiRoute(src: string): boolean {
  return src.startsWith('/api/');
}

/**
 * 解析图片路径，本地图片通过 API 路由获取
 * 解决生产环境无法访问运行时上传文件的问题
 *
 * @param src - 原始图片路径（如 /uploads/xxx.jpg 或 https://example.com/img.jpg）
 * @returns 解析后的路径（如 /api/public-files/uploads/xxx.jpg）
 */
export function resolveImageSrc(src: string | undefined): string {
  if (!src) return '';

  // 外部图片直接返回
  if (isExternalImage(src)) {
    return src;
  }

  // 已是 API 路由路径的直接返回
  if (isApiRoute(src)) {
    return src;
  }

  // 仅运行时文件（如 /uploads）通过 API 路由获取；public 下的静态资源直接走原始路径
  if (src.startsWith('/uploads/')) {
    return `/api/public-files${src}`;
  }

  return src;
}

/**
 * 判断图片是否需要标记为 unoptimized
 * 外部图片和 API 路由图片不需要 Next.js 优化
 */
export function shouldUnoptimizeImage(src: string | undefined): boolean {
  if (!src) return false;

  const resolved = resolveImageSrc(src);
  return isExternalImage(src) || resolved.startsWith('/api/');
}
