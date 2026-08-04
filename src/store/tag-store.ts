import fs from 'fs/promises';
import {
  DATA_DIR,
  DEFAULT_TAGS,
  TAGS_FILE,
  type Tag,
  type TagsData,
  type TagType,
} from '@/constant';
import {
  ensureDirectory,
  isFileNotFoundError,
  writeFileAtomic,
} from '@/utils/file-utils';

async function readTags(): Promise<TagsData> {
  await ensureDirectory(DATA_DIR);
  try {
    const data = await fs.readFile(TAGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      // 文件确实不存在：用默认值初始化
      await writeTags(DEFAULT_TAGS);
      return DEFAULT_TAGS;
    }
    // 其他错误（JSON 损坏、权限等）：不覆盖磁盘数据，返回默认值保证页面可用
    console.error('读取标签失败，保留现有数据', error);
    return DEFAULT_TAGS;
  }
}

async function writeTags(tags: TagsData): Promise<void> {
  await ensureDirectory(DATA_DIR);
  await writeFileAtomic(TAGS_FILE, JSON.stringify(tags, null, 2), {
    encoding: 'utf-8',
  });
}

// 标签存储操作
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
    const tags = await readTags();
    const newTag: Tag = {
      ...tag,
      lastUpdated: new Date().toISOString(),
    };
    tags[tag.type][tag.id] = newTag;
    await writeTags(tags);
    return newTag;
  },

  // 更新标签
  async update(
    id: string,
    type: TagType,
    updates: Partial<Omit<Tag, 'id' | 'type' | 'lastUpdated'>>
  ): Promise<Tag | null> {
    const tags = await readTags();
    const tag = tags[type][id];
    if (!tag) return null;

    const updatedTag: Tag = {
      ...tag,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    tags[type][id] = updatedTag;
    await writeTags(tags);
    return updatedTag;
  },

  // 删除标签
  async delete(id: string, type: TagType): Promise<boolean> {
    const tags = await readTags();
    if (!tags[type][id]) return false;
    delete tags[type][id];
    await writeTags(tags);
    return true;
  },

  // 重置为默认标签
  async resetToDefault(): Promise<TagsData> {
    await writeTags(DEFAULT_TAGS);
    return DEFAULT_TAGS;
  },

  // 检查标签是否存在
  async exists(id: string, type: TagType): Promise<boolean> {
    const tags = await readTags();
    return !!tags[type][id];
  },

  // 获取默认标签（用于类型定义等）
  getDefaultTags(): TagsData {
    return DEFAULT_TAGS;
  },
};
