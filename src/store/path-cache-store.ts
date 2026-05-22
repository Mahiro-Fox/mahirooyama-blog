// 后台管理系统uploads管理的路径缓存存储（内存存储，生产环境建议使用 Redis）
import { CACHE_MAX_AGE } from '@/constant';

interface PathCacheInfo {
  userId: string;
  path: string;
  lastUpdated: string;
}

const pathCaches: Map<string, PathCacheInfo> = new Map();

function cleanupExpiredCaches() {
  const now = Date.now();
  for (const [userId, cache] of pathCaches.entries()) {
    const lastUpdated = new Date(cache.lastUpdated).getTime();
    if (now - lastUpdated > CACHE_MAX_AGE) {
      pathCaches.delete(userId);
    }
  }
}

// 每小时清理一次过期缓存
setInterval(cleanupExpiredCaches, 60 * 60 * 1000);

export const pathCacheStore = {
  // 更新用户路径缓存
  update: (userId: string, path: string): void => {
    pathCaches.set(userId, {
      userId,
      path,
      lastUpdated: new Date().toISOString(),
    });
  },

  // 获取用户缓存的路径
  get: (userId: string): string | null => {
    const cache = pathCaches.get(userId);
    if (!cache) return null;

    // 检查是否过期
    const now = Date.now();
    const lastUpdated = new Date(cache.lastUpdated).getTime();
    if (now - lastUpdated > CACHE_MAX_AGE) {
      pathCaches.delete(userId);
      return null;
    }

    return cache.path;
  },

  // 删除用户的路径缓存
  delete: (userId: string): void => {
    pathCaches.delete(userId);
  },

  // 检查用户是否有缓存
  exists: (userId: string): boolean => {
    const cache = pathCaches.get(userId);
    if (!cache) return false;

    // 检查是否过期
    const now = Date.now();
    const lastUpdated = new Date(cache.lastUpdated).getTime();
    if (now - lastUpdated > CACHE_MAX_AGE) {
      pathCaches.delete(userId);
      return false;
    }

    return true;
  },

  // 获取所有缓存（调试用）
  getAll: (): Map<string, PathCacheInfo> => {
    return new Map(pathCaches);
  },

  // 清理所有过期缓存
  cleanup: cleanupExpiredCaches,
};
