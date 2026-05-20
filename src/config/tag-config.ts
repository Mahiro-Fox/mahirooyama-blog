import { TAG_TYPES, type TagTypeConfig } from '@/constant';

// 获取标签类型配置
export function getTagTypeConfig(type: 'blog' | 'gallery'): TagTypeConfig {
  return TAG_TYPES.find((t) => t.id === type) || TAG_TYPES[0];
}

// 获取所有标签类型 ID
export function getTagTypeIds(): ('blog' | 'gallery')[] {
  return TAG_TYPES.map((t) => t.id);
}
