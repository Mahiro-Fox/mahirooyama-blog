'use server';

import { revalidatePath } from 'next/cache';
import { Song } from '@/lib/music';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { goFetch } from '@/lib/server/api-client';
import { createUploadAction } from '@/lib/upload-actions';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MusicActions');

export async function getPublicMusic(): Promise<ActionResponse<Song[]>> {
  try {
    const songs = await goFetch<Song[]>('/api/music');
    return { success: true, data: songs };
  } catch (error) {
    logger.error('获取音乐列表失败', error);
    return { success: false, error: '获取音乐列表失败' };
  }
}

export async function adminGetMusic(): Promise<ActionResponse<Song[]>> {
  return withActionPermission('music:read', async () => {
    try {
      const songs = await goFetch<Song[]>('/api/music');
      return { success: true, data: songs };
    } catch (error) {
      logger.error('获取音乐列表失败', error);
      return { success: false, error: '获取音乐列表失败' };
    }
  });
}

export async function adminCreateMusic(input: {
  name: string;
  artist: string;
  url: string;
  cover: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission('music:create', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`music:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      const { name, artist, url, cover } = input;

      if (!name || name.trim().length === 0) {
        return { success: false, error: '歌曲名称不能为空' };
      }
      if (!artist || artist.trim().length === 0) {
        return { success: false, error: '歌手名称不能为空' };
      }
      if (!url || url.trim().length === 0) {
        return { success: false, error: '歌曲链接不能为空' };
      }

      await goFetch('/api/music', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          artist: artist.trim(),
          url: url.trim(),
          cover: cover.trim() || '',
        }),
      });

      logger.info('创建音乐成功', { userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('创建音乐失败', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }
  });
}

export async function adminUpdateMusic(
  id: string,
  input: { name?: string; artist?: string; url?: string; cover?: string }
): Promise<ActionResponse<void>> {
  return withActionPermission('music:update', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`music:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      const body: Record<string, string> = {};
      if (input.name !== undefined) {
        if (input.name.trim().length === 0) {
          return { success: false, error: '歌曲名称不能为空' };
        }
        body.name = input.name.trim();
      }
      if (input.artist !== undefined) {
        if (input.artist.trim().length === 0) {
          return { success: false, error: '歌手名称不能为空' };
        }
        body.artist = input.artist.trim();
      }
      if (input.url !== undefined) {
        if (input.url.trim().length === 0) {
          return { success: false, error: '歌曲链接不能为空' };
        }
        body.url = input.url.trim();
      }
      if (input.cover !== undefined) {
        body.cover = input.cover.trim() || '';
      }

      await goFetch(`/api/music/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      logger.info('更新音乐成功', { songId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新音乐失败', error, { songId: id });
      return { success: false, error: '更新失败' };
    }
  });
}

export async function adminDeleteMusic(
  id: string
): Promise<ActionResponse<void>> {
  return withActionPermission('music:delete', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`music:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    try {
      await goFetch(`/api/music/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        parseJson: false,
      });

      logger.info('删除音乐成功', { songId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除音乐失败', error, { songId: id });
      return { success: false, error: '删除失败' };
    }
  });
}

export const adminUploadMusicFile = createUploadAction({
  name: '音频文件',
  permission: 'music:create',
  rateLimitKey: 'music:{userId}',
  formField: 'audio',
  validation: { kind: 'mime', prefix: 'audio/', label: '音频' },
  storage: { kind: 'raw', dir: 'music' },
  result: { kind: 'raw-url', message: '音频上传成功' },
});
