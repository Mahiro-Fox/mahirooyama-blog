// 认证和安全常量（迁移到 Go 后端 JWT 鉴权后保留常量定义，避免大范围改引用）

/**
 * 后台用户会话 Cookie 名（默认 admin-session；允许环境变量覆盖——和 go backend config 对齐）
 */
export const ADMIN_SESSION_COOKIE =
  process.env.ADMIN_COOKIE_NAME ?? 'admin-session';

/**
 * 前台用户会话 Cookie 名（默认 user-session；允许环境变量覆盖）
 */
export const USER_SESSION_COOKIE =
  process.env.USER_COOKIE_NAME ?? 'user-session';

/**
 * 会话过期时间（秒）—— 用于 cookie maxAge；真正的 token 过期由 backend-go 签发决定
 */
export const SESSION_EXPIRY = 24 * 60 * 60;

/**
 * 会话最大年龄（毫秒）
 */
export const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * 默认管理员密码（环境变量仍可能被种子脚本使用，保留）
 */
export const ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD;
