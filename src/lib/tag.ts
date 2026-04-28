// 注意：标签数据已迁移到持久化存储
// 请使用 lib/tag-store 进行标签管理
// 此文件保留用于类型定义和向后兼容

import { BrandIcons } from '@/components/shared/brand-icons';

import { tagStore } from './tag-store';

/**
 * 标签类型（向后兼容）
 * @deprecated 请从 lib/tag-store 导入 Tag 类型
 */
export type Tag = {
  name: string;
  icon: keyof typeof BrandIcons;
};

/**
 * 获取博客标签（异步，从持久化存储）
 * @deprecated 请使用 tagStore.getByType('blog')
 */
export async function getBlogTags(): Promise<Record<string, Tag>> {
  const tags = await tagStore.getByType('blog');
  return Object.fromEntries(
    Object.entries(tags).map(([k, v]) => [
      k,
      { name: v.name, icon: v.icon as keyof typeof BrandIcons },
    ])
  );
}

/**
 * 获取图库标签（异步，从持久化存储）
 * @deprecated 请使用 tagStore.getByType('gallery')
 */
export async function getGalleryTags(): Promise<Record<string, Tag>> {
  const tags = await tagStore.getByType('gallery');
  return Object.fromEntries(
    Object.entries(tags).map(([k, v]) => [
      k,
      { name: v.name, icon: v.icon as keyof typeof BrandIcons },
    ])
  );
}

// 为了向后兼容，导出默认标签（静态数据）
// 但这些数据可能不会反映最新的更改
// 请使用 tagStore 获取最新数据
export const blogTags: Record<string, Tag> = {
  mdx: { name: 'MDX', icon: 'mdx' },
  github: { name: 'GitHub', icon: 'gitHub' },
  linux: { name: 'Linux', icon: 'linux' },
  nextjs: { name: 'Next.js', icon: 'nextjs' },
  tailwind: { name: 'Tailwind CSS', icon: 'tailwind' },
  typescript: { name: 'TypeScript', icon: 'ts' },
};

export const galleryTags: Record<string, Tag> = {
  nekonacho: { name: 'Nekonacho', icon: 'default' },
  bluearchive: { name: 'Blue Archive', icon: 'default' },
  lime: { name: 'Lime', icon: 'default' },
  meiyun: { name: 'Meiyun', icon: 'default' },
  vrchat: { name: 'VRChat', icon: 'vrchat' },
  bilibili: { name: 'Bilibili', icon: 'bilibili' },
};
