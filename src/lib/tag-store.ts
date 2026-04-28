import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');

export type TagType = 'blog' | 'gallery';

export interface Tag {
  id: string;
  name: string;
  icon: string;
  type: TagType;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagsData {
  blog: Record<string, Tag>;
  gallery: Record<string, Tag>;
}

const DEFAULT_TAGS: TagsData = {
  blog: {
    mdx: {
      id: 'mdx',
      name: 'MDX',
      icon: 'mdx',
      type: 'blog',
      description: 'MDX 相关文章',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    github: {
      id: 'github',
      name: 'GitHub',
      icon: 'gitHub',
      type: 'blog',
      description: 'GitHub 相关',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    linux: {
      id: 'linux',
      name: 'Linux',
      icon: 'linux',
      type: 'blog',
      description: 'Linux 系统',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    nextjs: {
      id: 'nextjs',
      name: 'Next.js',
      icon: 'nextjs',
      type: 'blog',
      description: 'Next.js 框架',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    tailwind: {
      id: 'tailwind',
      name: 'Tailwind CSS',
      icon: 'tailwind',
      type: 'blog',
      description: 'Tailwind CSS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    typescript: {
      id: 'typescript',
      name: 'TypeScript',
      icon: 'ts',
      type: 'blog',
      description: 'TypeScript',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  gallery: {
    nekonacho: {
      id: 'nekonacho',
      name: 'Nekonacho',
      icon: 'default',
      type: 'gallery',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    bluearchive: {
      id: 'bluearchive',
      name: 'Blue Archive',
      icon: 'default',
      type: 'gallery',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    lime: {
      id: 'lime',
      name: 'Lime',
      icon: 'default',
      type: 'gallery',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    meiyun: {
      id: 'meiyun',
      name: 'Meiyun',
      icon: 'default',
      type: 'gallery',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    vrchat: {
      id: 'vrchat',
      name: 'VRChat',
      icon: 'vrchat',
      type: 'gallery',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    bilibili: {
      id: 'bilibili',
      name: 'Bilibili',
      icon: 'bilibili',
      type: 'gallery',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
};

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readTags(): Promise<TagsData> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(TAGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // 文件不存在，使用默认值并创建文件
    await writeTags(DEFAULT_TAGS);
    return DEFAULT_TAGS;
  }
}

async function writeTags(tags: TagsData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(TAGS_FILE, JSON.stringify(tags, null, 2), 'utf-8');
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
  async create(tag: Omit<Tag, 'createdAt' | 'updatedAt'>): Promise<Tag> {
    const tags = await readTags();
    const newTag: Tag = {
      ...tag,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tags[tag.type][tag.id] = newTag;
    await writeTags(tags);
    return newTag;
  },

  // 更新标签
  async update(
    id: string,
    type: TagType,
    updates: Partial<Omit<Tag, 'id' | 'type' | 'createdAt'>>
  ): Promise<Tag | null> {
    const tags = await readTags();
    const tag = tags[type][id];
    if (!tag) return null;

    const updatedTag: Tag = {
      ...tag,
      ...updates,
      updatedAt: new Date().toISOString(),
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
