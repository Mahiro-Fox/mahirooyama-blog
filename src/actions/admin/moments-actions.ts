'use server';

import fs from 'fs/promises';
import { GALLERY_DIR, MOMENTS_FILE } from '@/constant/dir';

import { requirePermission } from '@/lib/permissions';

export interface Moment {
  id: string;
  createdAt: string;
  content: string;
  imageUrl?: string;
  moodEmoji?: string;
  location?: string;
}

// GET - 获取所有碎碎念
export async function adminGetMoments(): Promise<
  { success: true; moments: Moment[] } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('moments:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    // 如果不存在文件，创建文件
    try {
      await fs.access(MOMENTS_FILE);
    } catch {
      await fs.writeFile(MOMENTS_FILE, '[]', 'utf-8');
    }

    const content = await fs.readFile(MOMENTS_FILE, 'utf-8');
    const moments: Moment[] = JSON.parse(content);

    // 按创建时间倒序排列
    moments.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, moments };
  } catch (error) {
    console.error('获取碎碎念列表失败:', error);
    return { success: false, error: '获取碎碎念列表失败' };
  }
}

// POST - 创建碎碎念
export async function adminCreateMoment(input: {
  content: string;
  imageUrl?: string;
  moodEmoji?: string;
  location?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('moments:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const { content, imageUrl, moodEmoji, location } = input;

    if (!content || content.trim().length === 0) {
      return { success: false, error: '内容不能为空' };
    }

    if (content.length > 200) {
      return { success: false, error: '内容不能超过200字' };
    }

    // 读取现有数据
    const fileContent = await fs.readFile(MOMENTS_FILE, 'utf-8');
    const moments: Moment[] = JSON.parse(fileContent);

    // 生成唯一ID（使用时间戳）
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    const newMoment: Moment = {
      id,
      createdAt,
      content: content.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      moodEmoji: moodEmoji?.trim() || undefined,
      location: location?.trim() || undefined,
    };

    moments.push(newMoment);

    // 写入文件
    await fs.writeFile(MOMENTS_FILE, JSON.stringify(moments, null, 2), 'utf-8');

    // 如果有图片，同步到Gallery的"日常随笔"分类
    if (imageUrl) {
      await syncToGallery(newMoment);
    }

    return { success: true, id };
  } catch (error) {
    console.error('创建碎碎念失败:', error);
    return { success: false, error: '创建失败，请稍后重试' };
  }
}

// PUT - 更新碎碎念
export async function adminUpdateMoment(
  id: string,
  input: {
    content?: string;
    imageUrl?: string;
    moodEmoji?: string;
    location?: string;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('moments:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const { content, imageUrl, moodEmoji, location } = input;

    // 读取现有数据
    const fileContent = await fs.readFile(MOMENTS_FILE, 'utf-8');
    const moments: Moment[] = JSON.parse(fileContent);

    // 查找并更新
    const index = moments.findIndex((m) => m.id === id);
    if (index === -1) {
      return { success: false, error: '碎碎念不存在' };
    }

    if (content !== undefined) {
      if (content.trim().length === 0) {
        return { success: false, error: '内容不能为空' };
      }
      if (content.length > 200) {
        return { success: false, error: '内容不能超过200字' };
      }
      moments[index].content = content.trim();
    }

    if (imageUrl !== undefined) {
      moments[index].imageUrl = imageUrl.trim() || undefined;
    }

    if (moodEmoji !== undefined) {
      moments[index].moodEmoji = moodEmoji.trim() || undefined;
    }

    if (location !== undefined) {
      moments[index].location = location.trim() || undefined;
    }

    // 写入文件
    await fs.writeFile(MOMENTS_FILE, JSON.stringify(moments, null, 2), 'utf-8');

    return { success: true };
  } catch (error) {
    console.error('更新碎碎念失败:', error);
    return { success: false, error: '更新失败' };
  }
}

// DELETE - 删除碎碎念
export async function adminDeleteMoment(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('moments:delete');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    // 读取现有数据
    const fileContent = await fs.readFile(MOMENTS_FILE, 'utf-8');
    const moments: Moment[] = JSON.parse(fileContent);

    // 过滤掉要删除的项
    const filtered = moments.filter((m) => m.id !== id);

    if (filtered.length === moments.length) {
      return { success: false, error: '碎碎念不存在' };
    }

    // 写入文件
    await fs.writeFile(
      MOMENTS_FILE,
      JSON.stringify(filtered, null, 2),
      'utf-8'
    );

    return { success: true };
  } catch (error) {
    console.error('删除碎碎念失败:', error);
    return { success: false, error: '删除失败' };
  }
}

// 同步到Gallery的"日常随笔"分类
async function syncToGallery(moment: Moment): Promise<void> {
  if (!moment.imageUrl) return;

  try {
    const gallerySlug = `moment-${moment.id}`;
    const galleryFilePath = `${GALLERY_DIR}/${gallerySlug}.json`;

    const galleryData = {
      title: `碎碎念 - ${moment.content.slice(0, 20)}...`,
      description: moment.content,
      thumbnail: moment.imageUrl,
      lastUpdated: moment.createdAt.split('T')[0],
      tags: ['日常随笔'],
    };

    await fs.writeFile(
      galleryFilePath,
      JSON.stringify(galleryData, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('同步到Gallery失败:', error);
    // 不影响主流程，只记录错误
  }
}

// GET - 获取公开的碎碎念列表（用于前端展示）
export async function getPublicMoments(): Promise<
  { success: true; moments: Moment[] } | { success: false; error: string }
> {
  try {
    const content = await fs.readFile(MOMENTS_FILE, 'utf-8');
    console.log('content', content);
    const moments: Moment[] = JSON.parse(content);

    // 按创建时间倒序排列
    moments.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, moments };
  } catch (error) {
    console.error('获取碎碎念列表失败:', error);
    return { success: false, error: '获取碎碎念列表失败' };
  }
}
