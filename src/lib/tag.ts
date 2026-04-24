import { BrandIcons } from '@/components/shared/brand-icons';

/**
 * 标签类型
 */
export type Tag = {
  name: string;
  icon: keyof typeof BrandIcons;
};

/**
 * 标签记录
 */
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
