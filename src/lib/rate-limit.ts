interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// 清理过期的记录
function cleanup() {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

// 每5分钟清理一次
setInterval(cleanup, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs: number; // 时间窗口（毫秒）
  max: number; // 最大请求次数
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max } = options;

  return {
    check: async (
      identifier: string
    ): Promise<{ success: boolean; remaining: number; resetTime: number }> => {
      const now = Date.now();
      const record = store[identifier];

      if (!record || record.resetTime < now) {
        // 新窗口或窗口已过期
        store[identifier] = {
          count: 1,
          resetTime: now + windowMs,
        };
        return {
          success: true,
          remaining: max - 1,
          resetTime: now + windowMs,
        };
      }

      // 在窗口内
      if (record.count >= max) {
        return {
          success: false,
          remaining: 0,
          resetTime: record.resetTime,
        };
      }

      record.count++;
      return {
        success: true,
        remaining: max - record.count,
        resetTime: record.resetTime,
      };
    },
  };
}

// 登录尝试限制：5分钟内最多5次
export const loginRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 5,
});

// API 通用限制：1分钟内最多60次
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 60,
});

// Server Action 通用限制：1分钟内最多60次
export const serverActionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  max: 60,
});
