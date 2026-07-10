'use server';

import fs from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { MOMENTS_FILE } from '@/constant/dir';
import { MAX_FILE_SIZE } from '@/constant/file-upload';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { ensureFileInitialized } from '@/utils/file-utils';
import { processAndSaveImage } from '@/utils/image-utils';
import { createLogger } from '@/utils/logger';

import { serverActionRateLimiter } from '@/lib/rate-limit';

const logger = createLogger('MomentsActions');

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
export async function adminGetMoments(): Promise<ActionResponse<Moment[]>> {
  return withActionPermission('moments:read', async () => {
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

      return { success: true, data: moments };
    } catch (error) {
      logger.error('获取碎碎念列表失败', error);
      return { success: false, error: '获取碎碎念列表失败' };
    }
  });
}

// POST - 上传碎碎念图片
export async function adminUploadMomentImage(
  formData: FormData
): Promise<ActionResponse<{ image: MomentImage; message: string }>> {
  return withActionPermission('moments:create', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `moments:${user.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
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

      // 3. 验证文件大小 (最大 MAX_FILE_SIZE)
      if (file.size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `图片大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        };
      }

      // 4. 读取文件并处理
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 5. 处理并保存图片
      const result = await processAndSaveImage(buffer, {
        dir: 'images/moments',
        fileName: file.name,
        quality: 85,
      });

      // 6. 返回图片URL和尺寸信息
      logger.info('碎碎念图片上传成功', {
        fileName: file.name,
        userId: user.id,
      });
      return {
        success: true,
        data: {
          image: {
            url: result.url,
            width: result.width,
            height: result.height,
            ratio:
              result.width && result.height ? result.width / result.height : 1,
          },
          message: '图片上传成功',
        },
      };
    } catch (error) {
      logger.error('碎碎念图片上传失败', error);
      const errorMessage =
        error instanceof Error ? error.message : '图片上传失败';
      return { success: false, error: errorMessage };
    }
  });
}

// POST - 创建碎碎念
export async function adminCreateMoment(input: {
  content: string;
  image?: MomentImage;
  moodEmoji?: string;
  location?: string;
}): Promise<ActionResponse<{ id: string }>> {
  return withActionPermission('moments:create', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `moments:${user.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
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
      await fs.writeFile(
        MOMENTS_FILE,
        JSON.stringify(moments, null, 2),
        'utf-8'
      );

      logger.info('创建碎碎念成功', { momentId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: { id } };
    } catch (error) {
      logger.error('创建碎碎念失败', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }
  });
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
): Promise<ActionResponse<void>> {
  return withActionPermission('moments:update', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `moments:${user.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
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

      moments[index].image = image || undefined;
      moments[index].moodEmoji = moodEmoji?.trim() || undefined;
      moments[index].location = location?.trim() || undefined;

      // 写入文件
      await fs.writeFile(
        MOMENTS_FILE,
        JSON.stringify(moments, null, 2),
        'utf-8'
      );

      logger.info('更新碎碎念成功', { momentId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新碎碎念失败', error, { momentId: id });
      return { success: false, error: '更新失败' };
    }
  });
}

// DELETE - 删除碎碎念
export async function adminDeleteMoment(
  id: string
): Promise<ActionResponse<void>> {
  return withActionPermission('moments:delete', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `moments:${user.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
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

      logger.info('删除碎碎念成功', { momentId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除碎碎念失败', error, { momentId: id });
      return { success: false, error: '删除失败' };
    }
  });
}

// GET - 获取公开的碎碎念列表（用于前端展示）
export async function getPublicMoments(): Promise<ActionResponse<Moment[]>> {
  try {
    const content = await fs.readFile(MOMENTS_FILE, 'utf-8');
    const moments: Moment[] = JSON.parse(content);

    // 按创建时间倒序排列
    moments.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, data: moments };
  } catch (error) {
    logger.error('获取公开碎碎念列表失败', error);
    return { success: false, error: '获取碎碎念列表失败' };
  }
}
