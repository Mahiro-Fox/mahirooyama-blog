import { FileText, Image, LucideIcon } from 'lucide-react';

export interface TagTypeConfig {
  id: 'blog' | 'gallery';
  name: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

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

// 获取标签类型配置
export function getTagTypeConfig(type: 'blog' | 'gallery'): TagTypeConfig {
  return TAG_TYPES.find((t) => t.id === type) || TAG_TYPES[0];
}

// 获取所有标签类型 ID
export function getTagTypeIds(): ('blog' | 'gallery')[] {
  return TAG_TYPES.map((t) => t.id);
}
