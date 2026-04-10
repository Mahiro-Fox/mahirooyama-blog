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
  nextjs: { name: 'Next.js', icon: 'nextjs' },
  tailwind: { name: 'Tailwind CSS', icon: 'tailwind' },
  typescript: { name: 'TypeScript', icon: 'ts' },
};

export const galleryTags: Record<string, Tag> = {
  aurora: { name: 'Aurora', icon: 'default' },
  city: { name: 'City', icon: 'default' },
  landscape: { name: 'Landscape', icon: 'default' },
  star: { name: 'Star', icon: 'default' },
  vrchat: { name: 'VRChat', icon: 'vrchat' },
  bilibili: { name: 'Bilibili', icon: 'bilibili' },
};
