'use server';

import fs from 'fs/promises';
import path from 'path';
import { MOMENTS_FILE, UPLOADS_DIR } from '@/constant/dir';
import { ensureFileInitialized } from '@/utils/file-utils';
import sharp from 'sharp';

import { requirePermission } from '@/lib/permissions';

export interface MomentImage {
  url: string;
  width: number;
  height: number;
  ratio: number;
}

export interface Moment {
  id: string;
  createdAt: string;
  content: string;
  image?: MomentImage;
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
    await ensureFileInitialized(MOMENTS_FILE);
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

// POST - 上传碎碎念图片
export async function adminUploadMomentImage(
  formData: FormData
): Promise<
  | { success: true; image: MomentImage; message: string }
  | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('moments:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    // 1. 解析上传的文件
    const file = formData.get('image') as File | null;

    if (!file) {
      return { success: false, error: '未提供图片文件' };
    }

    // 2. 验证文件类型
    if (!file.type.startsWith('image/')) {
      return { success: false, error: '只允许上传图片文件' };
    }

    // 3. 验证文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: '图片大小不能超过 5MB' };
    }

    // 4. 确保上传目录存在
    const momentsUploadDir = path.join(UPLOADS_DIR, 'images/moments');
    try {
      await fs.access(momentsUploadDir);
    } catch {
      await fs.mkdir(momentsUploadDir, { recursive: true });
    }

    // 5. 读取文件并处理
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 6. 生成唯一文件名
    const timestamp = Date.now();
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const fileName = `${originalName}_${timestamp}.webp`;
    const filePath = path.join(momentsUploadDir, fileName);

    // 7. 使用 sharp 压缩并转换为 WebP
    await sharp(buffer).webp({ quality: 85 }).toFile(filePath);

    // 8. 返回图片URL和尺寸信息
    const imageUrl = `/uploads/images/moments/${fileName}`;
    const { width, height } = await sharp(buffer).metadata();
    return {
      success: true,
      image: {
        url: imageUrl,
        width: width || 0,
        height: height || 0,
        ratio: width && height ? width / height : 1,
      },
      message: '图片上传成功',
    };
  } catch (error) {
    console.error('碎碎念图片上传失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '图片上传失败';
    return { success: false, error: errorMessage };
  }
}

// POST - 创建碎碎念
export async function adminCreateMoment(input: {
  content: string;
  image?: MomentImage;
  moodEmoji?: string;
  location?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('moments:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const { content, image, moodEmoji, location } = input;

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
      image: image || undefined,
      moodEmoji: moodEmoji?.trim() || undefined,
      location: location?.trim() || undefined,
    };

    moments.push(newMoment);

    // 写入文件
    await fs.writeFile(MOMENTS_FILE, JSON.stringify(moments, null, 2), 'utf-8');

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
    image?: MomentImage;
    moodEmoji?: string;
    location?: string;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('moments:update');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    const { content, image, moodEmoji, location } = input;

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

    if (image !== undefined) {
      moments[index].image = image || undefined;
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

// GET - 获取公开的碎碎念列表（用于前端展示）
export async function getPublicMoments(): Promise<
  { success: true; moments: Moment[] } | { success: false; error: string }
> {
  try {
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
