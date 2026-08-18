import {
  getDefaultTags,
  type Tag,
  type TagsData,
  type TagType,
} from '@/constant';
import { goFetch } from '@/lib/server/api-client';

/**
 * 标签存储
 * 数据持久化由 Go 后端管理，本地仅做缓存与类型转换。
 */

interface GoTagRow {
  id: string;
  name: string;
  icon: string;
  type: TagType;
  description?: string;
  lastUpdated: string;
}

// 内存缓存
let cachedTags: TagsData | null = null;

// 将扁平的 Go 行数组转为嵌套的 TagsData 结构
function rowsToTagsData(rows: GoTagRow[]): TagsData {
  const data: TagsData = { blog: {}, gallery: {} };
  for (const row of rows) {
    const tag: Tag = {
      id: row.id,
      name: row.name,
      icon: row.icon,
      type: row.type,
      description: row.description,
      lastUpdated: row.lastUpdated,
    };
    if (row.type === 'blog') data.blog[row.id] = tag;
    else if (row.type === 'gallery') data.gallery[row.id] = tag;
  }
  return data;
}

async function loadFromGo(): Promise<TagsData> {
  const rows = await goFetch<GoTagRow[]>('/api/tags');
  return rowsToTagsData(rows);
}

async function readTags(): Promise<TagsData> {
  if (cachedTags) {
    return cachedTags;
  }
  try {
    cachedTags = await loadFromGo();
  } catch {
    // Go 后端不可用时回退默认值
    cachedTags = getDefaultTags();
  }
  return cachedTags;
}

export const tagStore = {
  // 获取所有标签
  async getAll(): Promise<TagsData> {
    return readTags();
  },

  // 获取指定类型的标签
  async getByType(type: TagType): Promise<Record<string, Tag>> {
    const tags = await readTags();
    return tags[type];
  },

  // 获取单个标签
  async getById(id: string, type: TagType): Promise<Tag | null> {
    const tags = await readTags();
    return tags[type][id] || null;
  },

  // 创建标签
  async create(tag: Omit<Tag, 'lastUpdated'>): Promise<Tag> {
    await goFetch('/api/admin/tags', {
      method: 'POST',
      body: JSON.stringify({
        id: tag.id,
        name: tag.name,
        icon: tag.icon || 'default',
        type: tag.type,
        description: tag.description || '',
      }),
    });
    cachedTags = null;
    return {
      ...tag,
      lastUpdated: new Date().toISOString(),
    };
  },

  // 更新标签
  async update(
    id: string,
    type: TagType,
    updates: Partial<Omit<Tag, 'id' | 'type' | 'lastUpdated'>>
  ): Promise<Tag | null> {
    const body: Record<string, string> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.icon !== undefined) body.icon = updates.icon;
    if (updates.description !== undefined)
      body.description = updates.description;

    try {
      const row = await goFetch<GoTagRow>(
        `/api/admin/tags/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      );
      cachedTags = null;
      return {
        id: row.id,
        name: row.name,
        icon: row.icon,
        type: row.type,
        description: row.description,
        lastUpdated: row.lastUpdated,
      };
    } catch {
      return null;
    }
  },

  // 删除标签
  async delete(id: string, type: TagType): Promise<boolean> {
    try {
      await goFetch(
        `/api/admin/tags/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          parseJson: false,
        }
      );
      cachedTags = null;
      return true;
    } catch {
      return false;
    }
  },

  // 重置为默认标签（逐个写入默认值，再刷新缓存）
  async resetToDefault(): Promise<TagsData> {
    const defaults = getDefaultTags();
    // 先删除现有的全部
    const current = await readTags();
    for (const type of ['blog', 'gallery'] as TagType[]) {
      for (const id of Object.keys(current[type])) {
        await goFetch(
          `/api/admin/tags/${encodeURIComponent(type)}/${encodeURIComponent(id)}`,
          { method: 'DELETE', parseJson: false }
        );
      }
    }
    // 再创建默认值
    for (const type of ['blog', 'gallery'] as TagType[]) {
      for (const tag of Object.values(defaults[type])) {
        await goFetch('/api/admin/tags', {
          method: 'POST',
          body: JSON.stringify({
            id: tag.id,
            name: tag.name,
            icon: tag.icon,
            type: tag.type,
            description: tag.description || '',
          }),
        });
      }
    }
    cachedTags = null;
    return readTags();
  },

  // 检查标签是否存在
  async exists(id: string, type: TagType): Promise<boolean> {
    const tags = await readTags();
    return !!tags[type][id];
  },

  // 获取默认标签（用于类型定义等）
  getDefaultTags(): TagsData {
    return getDefaultTags();
  },
};
