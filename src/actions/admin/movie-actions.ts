'use server';

import fs from 'fs/promises';
import { revalidatePath } from 'next/cache';
import { MOVIES_FILE } from '@/constant/dir';
import { getMovies, Movie } from '@/lib/movies';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MovieActions');

// GET - 获取所有电影（公开）
export async function getPublicMovies(
  search?: string,
  tag?: string
): Promise<ActionResponse<Movie[]>> {
  try {
    let movies = await getMovies();

    if (search) {
      const searchLower = search.toLowerCase();
      movies = movies.filter(
        (m) =>
          m.title.toLowerCase().includes(searchLower) ||
          m.summary.toLowerCase().includes(searchLower)
      );
    }

    if (tag) {
      movies = movies.filter((m) => m.tags.includes(tag));
    }

    // 按创建时间倒序排列
    movies.sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );

    return { success: true, data: movies };
  } catch (error) {
    logger.error('获取电影列表失败', error);
    return { success: false, error: '获取电影列表失败' };
  }
}

// GET - 获取所有电影（管理后台）
export async function adminGetMovies(): Promise<ActionResponse<Movie[]>> {
  return withActionPermission('movies:read', async () => {
    try {
      const movies = await getMovies();

      // 按创建时间倒序排列
      movies.sort(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );

      return { success: true, data: movies };
    } catch (error) {
      logger.error('获取电影列表失败', error);
      return { success: false, error: '获取电影列表失败' };
    }
  });
}

// POST - 创建电影
export async function adminCreateMovie(
  input: Omit<Movie, 'lastUpdated'>
): Promise<ActionResponse<void>> {
  return withActionPermission('movies:create', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `movies:${user.id}`
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
      const { id, title, poster, year, tags, summary, sources } = input;

      // 验证必填字段
      if (!id || id.trim().length === 0) {
        return { success: false, error: '电影ID不能为空' };
      }
      if (!title || title.trim().length === 0) {
        return { success: false, error: '电影标题不能为空' };
      }
      if (!poster || poster.trim().length === 0) {
        return { success: false, error: '电影海报不能为空' };
      }
      if (!year || year.trim().length === 0) {
        return { success: false, error: '电影年份不能为空' };
      }

      // 读取现有数据
      const movies = await getMovies();

      // 检查ID是否已存在
      if (movies.some((m) => m.id === id.trim())) {
        return { success: false, error: '该ID已存在，请使用其他ID' };
      }

      const updated_at = new Date().toISOString();

      const newMovie: Movie = {
        id: id.trim(),
        title: title.trim(),
        poster: poster.trim(),
        year: year.trim(),
        tags: tags || [],
        summary: summary || '',
        lastUpdated: updated_at,
        sources: sources || [],
      };

      movies.push(newMovie);

      // 写入文件
      await fs.writeFile(MOVIES_FILE, JSON.stringify(movies, null, 2), 'utf-8');

      logger.info('创建电影成功', { movieId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('创建电影失败', error);
      return { success: false, error: '创建失败，请稍后重试' };
    }
  });
}

// PUT - 更新电影
export async function adminUpdateMovie(
  input: Partial<Movie> & { id: string }
): Promise<ActionResponse<void>> {
  return withActionPermission('movies:update', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `movies:${user.id}`
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
      const { id, title, poster, year, tags, summary, sources } = input;

      // 读取现有数据
      const movies = await getMovies();

      // 查找并更新
      const index = movies.findIndex((m) => m.id === id);
      if (index === -1 || !movies[index]) {
        return { success: false, error: '电影不存在' };
      }

      if (title !== undefined) {
        if (title.trim().length === 0) {
          return { success: false, error: '电影标题不能为空' };
        }
        movies[index].title = title.trim();
      }
      if (poster !== undefined) {
        if (poster.trim().length === 0) {
          return { success: false, error: '电影海报不能为空' };
        }
        movies[index].poster = poster.trim();
      }
      if (year !== undefined) {
        if (year.trim().length === 0) {
          return { success: false, error: '电影年份不能为空' };
        }
        movies[index].year = year.trim();
      }

      movies[index].tags = tags || [];
      movies[index].summary = summary || '';
      movies[index].sources = sources || [];

      // 写入文件
      await fs.writeFile(MOVIES_FILE, JSON.stringify(movies, null, 2), 'utf-8');

      logger.info('更新电影成功', { movieId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('更新电影失败', error, { movieId: input.id });
      return { success: false, error: '更新失败' };
    }
  });
}

// DELETE - 删除电影
export async function adminDeleteMovie(
  id: string
): Promise<ActionResponse<void>> {
  return withActionPermission('movies:delete', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `movies:${user.id}`
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
      const movies = await getMovies();

      // 过滤掉要删除的项
      const filtered = movies.filter((m) => m.id !== id);

      if (filtered.length === movies.length) {
        return { success: false, error: '电影不存在' };
      }

      // 写入文件
      await fs.writeFile(
        MOVIES_FILE,
        JSON.stringify(filtered, null, 2),
        'utf-8'
      );

      logger.info('删除电影成功', { movieId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除电影失败', error, { movieId: id });
      return { success: false, error: '删除失败' };
    }
  });
}
