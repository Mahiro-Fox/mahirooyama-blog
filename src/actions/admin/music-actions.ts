'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { goFetch } from '@/lib/server/api-client';
import { createGoUploadAction } from '@/lib/upload';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';
import { resolveAbsoluteUrl } from '@/utils/utils';

const logger = createLogger('MusicActions');

export async function getPublicMusic(): Promise<ActionResponse<Music[]>> {
  try {
    const songs = await goFetch<Music[]>('/api/music');
    return { success: true, data: songs };
  } catch (error) {
    logger.error('获取音乐列表失败', error);
    return { success: false, error: '获取音乐列表失败' };
  }
}

export async function adminGetMusic(): Promise<ActionResponse<Music[]>> {
  return withActionPermission('music:read', async () => {
    try {
      const songs = await goFetch<Music[]>('/api/music');
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

export const adminUploadMusicFile = createGoUploadAction({
  name: '音频文件',
  permission: 'music:create',
  rateLimitKey: 'music:{userId}',
  formField: 'audio',
  label: '音频',
  dir: 'music',
  target: 'raw',
  result: { kind: 'raw-url', message: '音频上传成功' },
});

export interface UrlCheckResult {
  songId: string;
  url: string;
  valid: boolean;
  error?: string;
}

/**
 * 批量测试所有音乐 URL 是否可访问（HEAD 请求探测）。
 * 探测由服务端发起，避免浏览器 CORS 限制。
 * 对相对路径（本地静态资源）会基于当前请求 host 自动补全为绝对 URL。
 */
export async function adminTestAllMusicUrls(): Promise<
  ActionResponse<UrlCheckResult[]>
> {
  return withActionPermission('music:read', async (user) => {
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `music-test:${user.id}`
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
      // 取当前请求 host，用于解析相对路径链接
      const h = await headers();
      const host = h.get('x-forwarded-host') || h.get('host') || undefined;

      // 先获取列表
      const songs = await goFetch<Music[]>('/api/music');

      // 并行探测（限制并发 5 个，避免占太多连接）
      const results: UrlCheckResult[] = [];
      const concurrency = 5;
      for (let i = 0; i < songs.length; i += concurrency) {
        const batch = songs.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          batch.map(async (song): Promise<UrlCheckResult> => {
            const url = song.url.trim();
            if (!url) {
              return { songId: song.id, url, valid: false, error: '链接为空' };
            }
            try {
              // 相对路径用站点 host 补全后再探测
              const targetUrl = resolveAbsoluteUrl(url, host);
              // 用 HEAD 请求探测有效性，不下载全量音频
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s 超时
              const resp = await fetch(targetUrl, {
                method: 'HEAD',
                signal: controller.signal,
              });
              clearTimeout(timeoutId);

              // 2xx → 有效；否则无效
              const valid = resp.status >= 200 && resp.status < 300;
              return {
                songId: song.id,
                url,
                valid,
                error: valid ? undefined : `HTTP ${resp.status}`,
              };
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              return {
                songId: song.id,
                url,
                valid: false,
                error: msg || '网络错误',
              };
            }
          })
        );
        results.push(...batchResults);
      }

      logger.info(
        `测试完成，共 ${results.length} 首，其中 ${results.filter((r) => !r.valid).length} 首无效`
      );
      return { success: true, data: results };
    } catch (error) {
      logger.error('批量测试音乐链接失败', error);
      return { success: false, error: '测试失败，请稍后重试' };
    }
  });
}
