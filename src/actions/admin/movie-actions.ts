'use server';

import { revalidatePath } from 'next/cache';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { buildQuery, goFetch } from '@/lib/server/api-client';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MovieActions');

// GET - 获取公开电影列表（前端展示）
// 数据源已迁移至 Go 后端，Go 侧按 created_at DESC 排序并支持 search/tag 过滤
export async function getPublicMovies(
  search?: string,
  tag?: string
): Promise<ActionResponse<Movie[]>> {
  try {
    const query = buildQuery({ search, tag });
    const movies = await goFetch<Movie[]>(`/api/movies${query}`);
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
      const movies = await goFetch<Movie[]>('/api/movies');
      return { success: true, data: movies };
    } catch (error) {
      logger.error('获取电影列表失败', error);
      return { success: false, error: '获取电影列表失败' };
    }
  });
}

// POST - 创建电影
export async function adminCreateMovie(
  input: Omit<Movie, 'created_at' | 'updated_at'>
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
      await goFetch('/api/movies', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      logger.info('创建电影成功', { movieId: input.id, userId: user.id });
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
  input: Partial<Omit<Movie, 'created_at' | 'updated_at'>> & { id: string }
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
      const { id, ...updates } = input;
      await goFetch(`/api/movies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

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
      await goFetch(`/api/movies/${id}`, {
        method: 'DELETE',
        parseJson: false,
      });

      logger.info('删除电影成功', { movieId: id, userId: user.id });
      revalidatePath('/', 'layout');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('删除电影失败', error, { movieId: id });
      return { success: false, error: '删除失败' };
    }
  });
}
