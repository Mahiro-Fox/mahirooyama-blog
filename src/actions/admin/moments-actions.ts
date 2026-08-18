'use server';

import { revalidatePath } from 'next/cache';
import { Moment, MomentImage } from '@/lib/moments';
import { goFetch } from '@/lib/server/api-client';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { createUploadAction } from '@/lib/upload-actions';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MomentsActions');

// GET - 获取所有碎碎念
export async function adminGetMoments(): Promise<ActionResponse<Moment[]>> {
  return withActionPermission('moments:read', async () => {
    try {
      const moments = await goFetch<Moment[]>('/api/moments');
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

      await goFetch('/api/moments', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          image: image ?? null,
          moodEmoji: moodEmoji?.trim() || '',
          location: location?.trim() || '',
        }),
      });

      logger.info('创建碎碎念成功', { userId: user.id });
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
      const body: Record<string, unknown> = {};

      if (content !== undefined) {
        if (content.trim().length === 0) {
          return { success: false, error: '内容不能为空' };
        }
        if (content.length > 200) {
          return { success: false, error: '内容不能超过200字' };
        }
        body.content = content.trim();
      }
      if (image !== undefined) body.image = image ?? null;
      if (moodEmoji !== undefined) body.moodEmoji = moodEmoji.trim();
      if (location !== undefined) body.location = location.trim();

      await goFetch(`/api/moments/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

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
      await goFetch(`/api/moments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        parseJson: false,
      });

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
    const moments = await goFetch<Moment[]>('/api/moments');
    return { success: true, data: moments };
  } catch (error) {
    logger.error('获取公开碎碎念列表失败', error);
    return { success: false, error: '获取碎碎念列表失败' };
  }
}
