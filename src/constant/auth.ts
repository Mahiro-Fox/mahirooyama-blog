// 认证和安全常量

// JWT 密钥 (从环境变量获取)
export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// 会话过期时间 (24小时，单位：秒)
export const SESSION_EXPIRY = 24 * 60 * 60;

// 会话刷新阈值 (4小时，单位：秒)
export const SESSION_REFRESH_THRESHOLD = 4 * 60 * 60;

// 会话最大年龄 (24小时，单位：毫秒)
export const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;