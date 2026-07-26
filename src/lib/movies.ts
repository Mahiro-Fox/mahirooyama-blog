'use server';

import fs from 'fs/promises';
import { MOVIES_DIR } from '@/constant/dir';
import { ensureFileInitialized } from '@/utils/file-utils';
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
  updated_at: string;
  sources: MovieSource[];
}
// GET - 获取公开的电影列表（用于前端展示）
export async function getMovies(): Promise<Movie[]> {
  try {
    await ensureFileInitialized(MOVIES_DIR);
    const content = await fs.readFile(MOVIES_DIR, 'utf-8');
    const movies: Movie[] = JSON.parse(content);
    return movies;
  } catch (error) {
    logger.error('获取电影列表失败', error);
    return [];
  }
}
