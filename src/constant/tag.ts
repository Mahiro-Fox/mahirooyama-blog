import { FileText, Image, type LucideIcon } from 'lucide-react';

export type TagType = 'blog' | 'gallery';

export interface Tag {
  id: string;
  name: string;
  icon: string;
  type: TagType;
  description?: string;
  lastUpdated: string;
}

export interface TagsData {
  blog: Record<string, Tag>;
  gallery: Record<string, Tag>;
}

export interface TagTypeConfig {
  id: 'blog' | 'gallery';
  name: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

// 默认标签数据
export const DEFAULT_TAGS: TagsData = {
  blog: {
    mdx: {
      id: 'mdx',
      name: 'MDX',
      icon: 'mdx',
      type: 'blog',
      description: 'MDX 相关文章',
      lastUpdated: new Date().toISOString(),
    },
    github: {
      id: 'github',
      name: 'GitHub',
      icon: 'gitHub',
      type: 'blog',
      description: 'GitHub 相关',
      lastUpdated: new Date().toISOString(),
    },
    linux: {
      id: 'linux',
      name: 'Linux',
      icon: 'linux',
      type: 'blog',
      description: 'Linux 系统',
      lastUpdated: new Date().toISOString(),
    },
    nextjs: {
      id: 'nextjs',
      name: 'Next.js',
      icon: 'nextjs',
      type: 'blog',
      description: 'Next.js 框架',
      lastUpdated: new Date().toISOString(),
    },
    tailwind: {
      id: 'tailwind',
      name: 'Tailwind CSS',
      icon: 'tailwind',
      type: 'blog',
      description: 'Tailwind CSS',
      lastUpdated: new Date().toISOString(),
    },
    typescript: {
      id: 'typescript',
      name: 'TypeScript',
      icon: 'ts',
      type: 'blog',
      description: 'TypeScript',
      lastUpdated: new Date().toISOString(),
    },
  },
  gallery: {
    nekonacho: {
      id: 'nekonacho',
      name: 'Nekonacho',
      icon: 'default',
      type: 'gallery',
      lastUpdated: new Date().toISOString(),
    },
    bluearchive: {
      id: 'bluearchive',
      name: 'Blue Archive',
      icon: 'default',
      type: 'gallery',
      lastUpdated: new Date().toISOString(),
    },
    lime: {
      id: 'lime',
      name: 'Lime',
      icon: 'default',
      type: 'gallery',
      lastUpdated: new Date().toISOString(),
    },
    meiyun: {
      id: 'meiyun',
      name: 'Meiyun',
      icon: 'default',
      type: 'gallery',
      lastUpdated: new Date().toISOString(),
    },
    vrchat: {
      id: 'vrchat',
      name: 'VRChat',
      icon: 'vrchat',
      type: 'gallery',
      lastUpdated: new Date().toISOString(),
    },
    bilibili: {
      id: 'bilibili',
      name: 'Bilibili',
      icon: 'bilibili',
      type: 'gallery',
      lastUpdated: new Date().toISOString(),
    },
  },
};

// 标签类型配置
export const TAG_TYPES: TagTypeConfig[] = [
  {
    id: 'blog',
    name: '文章',
    label: '文章标签',
    icon: FileText,
    description: '用于博客文章分类',
  },
  {
    id: 'gallery',
    name: '图库',
    label: '图库标签',
    icon: Image,
    description: '用于图库图片分类',
  },
];
