# 登录安全功能说明

本项目实现了多层安全机制的登录系统。

## 安全特性清单

### 1. 密码哈希存储 (bcrypt)

- **文件**: `src/app/api/login/route.ts`
- **说明**: 使用 bcryptjs 对密码进行哈希存储，而非明文
- **配置**: 设置 `ADMIN_PASSWORD_HASH` 环境变量
- **生成哈希**: 运行 `npx tsx scripts/hash-password.ts <password>`

### 2. 防暴力破解 (速率限制)

- **文件**: `src/lib/rate-limit.ts`, `src/middleware.ts`
- **限制**: 5分钟内最多5次登录尝试
- **响应**: HTTP 429 状态码 + Retry-After 头
- **界面**: 登录页显示倒计时提示

### 3. 强密钥检查

- **文件**: `src/middleware.ts`
- **要求**: JWT_SECRET 最少32字符
- **行为**: 启动时检查，不满足则抛出错误阻止启动

### 4. 安全响应头

- **文件**: `src/middleware.ts`, `next.config.mjs`
- **包含**:
  - `X-Frame-Options: DENY` - 防止点击劫持
  - `X-Content-Type-Options: nosniff` - 防止 MIME 嗅探
  - `X-XSS-Protection: 1; mode=block` - XSS 防护
  - `Strict-Transport-Security` - HSTS 强制 HTTPS
  - `Content-Security-Policy` - CSP 内容安全策略
  - `Cache-Control: no-store` - 管理页面禁用缓存

### 5. 会话刷新 (Sliding Session)

- **文件**: `src/middleware.ts`
- **机制**: 当会话剩余时间少于4小时时，自动签发新 token
- **好处**: 活跃用户不会被迫重新登录

### 6. 单设备登录

- **文件**: `src/lib/session-store.ts`, `src/app/api/login/route.ts`
- **机制**: 新登录会使旧会话失效
- **提示**: "会话已在其他设备上失效，请重新登录"

### 7. 时序攻击防护

- **文件**: `src/app/api/login/route.ts`
- **机制**: 密码错误时添加 50-150ms 随机延迟
- **目的**: 防止通过响应时间判断密码正确性

### 8. HTTPOnly Cookie

- **设置**: `httpOnly: true`, `sameSite: 'strict'`
- **好处**: XSS 攻击无法读取 session token

## 环境变量配置

```env
# 推荐：使用密码哈希（生产环境）
ADMIN_PASSWORD_HASH=$2a$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 备选：明文密码（仅开发）
ADMIN_PASSWORD=your-password

# 必需：JWT 密钥（最少32字符）
JWT_SECRET=your-secret-key-minimum-32-characters-long

# 可选：自定义会话和速率限制
SESSION_EXPIRY=86400
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX=5
```

## 使用指南

### 生成密码哈希

```bash
npx tsx scripts/hash-password.ts your-secure-password
```

### 生产环境部署检查清单

- [ ] 设置强 JWT_SECRET (>=32字符)
- [ ] 使用 ADMIN_PASSWORD_HASH 而非明文密码
- [ ] 启用 HTTPS (HSTS 头需要)
- [ ] 移除或限制 CORS 中的 `unsafe-eval`
- [ ] 配置反向代理 (Nginx/Cloudflare) 添加额外安全头
- [ ] 考虑使用 Redis 替代内存 session 存储 (多实例部署)

## 会话生命周期

1. **登录**: 签发 24h JWT + 设置 HTTPOnly cookie
2. **验证**: 中间件验证 token 有效性
3. **刷新**: 剩余 <4h 时自动续期 24h
4. **失效**: 新登录踢出旧会话
5. **登出**: 清除 cookie + 删除服务端 session 记录
6. **过期**: 24h 无活动或手动登出

## 安全最佳实践

1. 定期更换 JWT_SECRET 并强制所有用户重新登录
2. 监控登录失败日志，发现异常 IP 及时封禁
3. 考虑添加 2FA (双因素认证) 进一步提升安全性
4. 生产环境使用 Redis 存储会话，支持分布式部署
