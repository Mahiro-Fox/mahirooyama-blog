'use server';

import fs from 'fs/promises';
import { MOVIES_FILE } from '@/constant/dir';
import { ensureFileInitialized, isFileNotFoundError } from '@/utils/file-utils';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MovieActions');

export interface MovieSource {
  name: string;
  url: string;
}

export interface Movie {
  id: string;
  title: string;
  poster: string;
  year: string;
  tags: string[];
  summary: string;
  lastUpdated: string;
  sources: MovieSource[];
}
// GET - 获取公开的电影列表（用于前端展示）
export async function getMovies(): Promise<Movie[]> {
  try {
    await ensureFileInitialized(MOVIES_FILE);
    const content = await fs.readFile(MOVIES_FILE, 'utf-8');
    const movies: Movie[] = JSON.parse(content);
    return movies;
  } catch (error) {
    // 文件确实缺失 → 视为空；其他错误（JSON 损坏等）上抛，避免静默丢数据
    if (isFileNotFoundError(error)) return [];
    logger.error('获取电影列表失败', error);
    throw error;
  }
}
