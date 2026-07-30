'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { MUSIC_DIR, MUSIC_FILE } from '@/constant/dir';
import { MAX_FILE_SIZE } from '@/constant/file-upload';
import { getMusics, Song } from '@/lib/music';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { ensureDirectory } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MusicActions');

export async function getPublicMusic(): Promise<ActionResponse<Song[]>> {
  try {
    const songs = await getMusics();
    return { success: true, data: songs };
  } catch (error) {
    logger.error('获取音乐列表失败', error);
    return { success: false, error: '获取音乐列表失败' };
  }
}

export async function adminGetMusic(): Promise<ActionResponse<Song[]>> {
  return withActionPermission('music:read', async () => {
    try {
      const songs = await getMusics();
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
}): Promise<ActionResponse<{ id: string }>> {
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

      const songs = await getMusics();

      const id = Date.now().toString();

      const newSong: Song = {
        id,
        name: name.trim(),
        artist: artist.trim(),
        url: url.trim(),
        cover: cover.trim() || '',
      };

      songs.push(newSong);

      await fs.writeFile(MUSIC_FILE, JSON.stringify(songs, null, 2), 'utf-8');

      logger.info('创建音乐成功', { songId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: { id } };
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
      const { name, artist, url, cover } = input;

      const songs = await getMusics();

      const index = songs.findIndex((s) => s.id === id);
      if (index === -1) {
        return { success: false, error: '音乐不存在' };
      }

      if (name !== undefined) {
        if (name.trim().length === 0) {
          return { success: false, error: '歌曲名称不能为空' };
        }
        songs[index].name = name.trim();
      }

      if (artist !== undefined) {
        if (artist.trim().length === 0) {
          return { success: false, error: '歌手名称不能为空' };
        }
        songs[index].artist = artist.trim();
      }

      if (url !== undefined) {
        if (url.trim().length === 0) {
          return { success: false, error: '歌曲链接不能为空' };
        }
        songs[index].url = url.trim();
      }

      if (cover !== undefined) {
        songs[index].cover = cover.trim() || '';
      }

      await fs.writeFile(MUSIC_FILE, JSON.stringify(songs, null, 2), 'utf-8');

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
      const songs = await getMusics();

      const filtered = songs.filter((s) => s.id !== id);

      if (filtered.length === songs.length) {
        return { success: false, error: '音乐不存在' };
      }

      await fs.writeFile(
        MUSIC_FILE,
        JSON.stringify(filtered, null, 2),
        'utf-8'
      );

      logger.info('删除音乐成功', { songId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除音乐失败', error, { songId: id });
      return { success: false, error: '删除失败' };
    }
  });
}

export async function adminUploadMusicFile(
  formData: FormData
): Promise<ActionResponse<{ url: string; message: string }>> {
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
      const file = formData.get('audio') as File | null;

      if (!file) {
        return { success: false, error: '未提供音频文件' };
      }

      if (!file.type.startsWith('audio/')) {
        return { success: false, error: '只允许上传音频文件' };
      }

      if (file.size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `音频大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        };
      }

      await ensureDirectory(MUSIC_DIR);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const timestamp = Date.now();
      const ext = path.extname(file.name) || '.mp3';
      const fileName = `${timestamp}${ext}`;
      const filePath = path.join(MUSIC_DIR, fileName);

      await fs.writeFile(filePath, buffer);

      const url = `/uploads/music/${fileName}`;

      logger.info('上传音频成功', { fileName, userId: user.id });

      return {
        success: true,
        data: { url, message: '音频上传成功' },
      };
    } catch (error) {
      logger.error('上传音频失败', error);
      return { success: false, error: '上传失败' };
    }
  });
}
