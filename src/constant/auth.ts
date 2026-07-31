// 认证和安全常量

/**
 * JWT 密钥 (从环境变量获取)
 */
export const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security'
    );
  }
  return new TextEncoder().encode(secret);
})();

/**
 * 会话过期时间 (24小时，单位：秒)
 */
export const SESSION_EXPIRY = 24 * 60 * 60;

/**
 * 会话刷新阈值 (4小时，单位：秒)
 */
export const SESSION_REFRESH_THRESHOLD = 4 * 60 * 60;

/**
 * 会话最大年龄 (24小时，单位：毫秒)
 */
export const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;
