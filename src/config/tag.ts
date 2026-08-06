import { TAG_TYPES, type TagType, type TagTypeConfig } from '@/constant';

// 获取标签类型配置
export function getTagTypeConfig(type: TagType): TagTypeConfig {
  return TAG_TYPES.find((t) => t.id === type) || TAG_TYPES[0];
}
