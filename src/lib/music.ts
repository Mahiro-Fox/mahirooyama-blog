'use server';

import fs from 'fs/promises';
import { MUSIC_FILE } from '@/constant/dir';
import { ensureFileInitialized, isFileNotFoundError } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MusicActions');
export interface Song {
  id: string;
  name: string;
  artist: string;
  url: string;
  cover: string;
}

export async function getMusics(): Promise<Song[]> {
  try {
    await ensureFileInitialized(MUSIC_FILE);
    const content = await fs.readFile(MUSIC_FILE, 'utf-8');
    const songs: Song[] = JSON.parse(content);
    return songs;
  } catch (error) {
    // 文件确实缺失 → 视为空；其他错误（JSON 损坏等）上抛，避免静默丢数据
    if (isFileNotFoundError(error)) return [];
    logger.error('获取音乐列表失败', error);
    throw error;
  }
}
