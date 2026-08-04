'use server';

import { revalidatePath } from 'next/cache';
import { MOMENTS_FILE } from '@/constant/dir';
import { getMoments, Moment, MomentImage } from '@/lib/moments';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { createUploadAction } from '@/lib/upload-actions';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { writeFileAtomic } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MomentsActions');

// GET - 获取所有碎碎念
export async function adminGetMoments(): Promise<ActionResponse<Moment[]>> {
  return withActionPermission('moments:read', async () => {
    try {
      const moments = await getMoments();

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

export const adminUploadMomentImage = createUploadAction({
  name: '碎碎念图片',
  permission: 'moments:create',
  rateLimitKey: 'moments:{userId}',
  formField: 'image',
  validation: { kind: 'mime', prefix: 'image/', label: '图片' },
  storage: { kind: 'image', dir: 'images/moments', quality: 85 },
  result: { kind: 'image-full', message: '图片上传成功' },
});

// POST - 创建碎碎念
export async function adminCreateMoment(input: {
  content: string;
  image?: MomentImage;
  moodEmoji?: string;
  location?: string;
}): Promise<ActionResponse<void>> {
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
      const moments = await getMoments();

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
      await writeFileAtomic(
        MOMENTS_FILE,
        JSON.stringify(moments, null, 2),
        { encoding: 'utf-8' }
      );

      logger.info('创建碎碎念成功', { momentId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
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
      const moments = await getMoments();

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
      await writeFileAtomic(
        MOMENTS_FILE,
        JSON.stringify(moments, null, 2),
        { encoding: 'utf-8' }
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
      const moments = await getMoments();

      // 过滤掉要删除的项
      const filtered = moments.filter((m) => m.id !== id);

      if (filtered.length === moments.length) {
        return { success: false, error: '碎碎念不存在' };
      }

      // 写入文件
      await writeFileAtomic(
        MOMENTS_FILE,
        JSON.stringify(filtered, null, 2),
        { encoding: 'utf-8' }
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
    const moments = await getMoments();

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
