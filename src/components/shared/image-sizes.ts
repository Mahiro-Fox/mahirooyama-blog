/**
 * 图片尺寸配置
 * 用于不同布局场景
 */
export const imageSizes = {
  // 画廊网格: 1列(移动) / 2列(平板) / 3列(桌面)
  galleryGrid: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',

  // 博客网格
  blogGrid: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',

  // 轮播/首屏大图
  hero: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw',

  // 详情页主图
  detail: '(max-width: 896px) 100vw, 896px',

  // 小缩略图 (compact 布局)
  thumbnail: '(max-width: 768px) 20vw, 15vw',

  // 侧边栏/小部件
  sidebar: '(max-width: 768px) 30vw, 20vw',
} as const;
