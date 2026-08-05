# 剩余待办问题清单

> 更新日期：2026-08-05
> 本仓库为 Next.js 16 + App Router 博客，无 SQL 数据库，持久化在文件系统（`data/*.json`、`uploads/content/*`）。
> P0/P1 的六项核心修复已完成（见"已完成"表），本文档记录**尚未处理**的改进项，按优先级从高到低排列。

---

## 已完成（本次修复）

| 项 | 说明 |
| --- | --- |
| P0-1 路径穿越 | 新增 `resolveContentPath`，覆盖 mdx/gallery 的 `[slug]` 路由 GET/DELETE/PUT/PATCH 及两个 POST 的 slug 字段；blog-actions 补 `validateSlug` 纵深防御 |
| P0-3 默认密码 | `mustChangePassword` 首次登录强制改密 + `ADMIN_DEFAULT_PASSWORD` 环境变量 |
| P0-4 非原子写入 | `writeFileAtomic`（临时文件+rename）覆盖 23 处 JSON/MDX 写入点 |
| P1-5 错误吞掉 | `getMovies/getGuestbook/getMoments/getMusics` 区分 ENOENT 与真实错误；`tag-store.readTags` 去除破坏性覆盖写 |
| P1-6 权限死代码 | 移除 `PermissionChecker`/`RBACPermissionChecker`/`hasLegacyPermission`/`moduleMap` 等零调用代码 |
| P1-7 零测试 | 引入 Vitest（`pnpm test`），15 个单测覆盖 file-utils 核心逻辑 |
| 预存在 typecheck 卡点 | 删除全注释死文件 `src/app/api/proxy/route.ts`，`pnpm typecheck` 恢复通过 |

---

## P0 · 安全（建议尽快处理）

### 1. 会话与限流全部存在内存（原 P0-2，涉及 Redis 暂缓）

- **现状**：`src/store/session-store.ts` 用模块级 `Map` 存会话 token；`src/lib/rate-limit.ts` 用模块级对象存计数。
- **风险**：服务重启/多实例部署后会话全部失效（用户被登出）；限流按进程隔离，多实例可被绕过；"单设备登录"踢出逻辑在 serverless 下失效。
- **建议**：会话改为签名的无状态 Cookie（`jose` 已在用，`verifyAuth` 已按 JWT 校验）；限流上移到 Redis 或持久化存储。
- **涉及**：`src/store/session-store.ts`、`src/lib/rate-limit.ts`、`src/lib/admin-auth.ts`、`src/actions/admin/auth.ts`

### 2. `/api/analytics` DELETE 无权限校验

- **现状**：`src/app/api/analytics/route.ts:272` 的 `DELETE()` 是公开端点，无 `requirePermission`。
- **风险**：任何人可触发删除 analytics 日志文件。虽只删 `analytics-YYYY-MM-DD.json` 过期文件（路径由 readdir 生成，无穿越），但属于未认证的破坏性操作，可被滥用清空数据。
- **建议**：加 `requirePermission('analytics:delete')`（若无该权限定义则新增），或改为仅内部触发的清理任务。

### 3. 二进制上传未原子化

- **现状**：`src/utils/image-utils.ts:86,104`、`src/lib/upload-actions.ts:215`、`src/app/api/upload-files/route.ts:125` 直接 `writeFile` 二进制。
- **风险**：上传写入中途崩溃会留下损坏/半截文件。
- **建议**：统一改走 `writeFileAtomic`。

---

## P1 · 可靠性 / 数据完整性

### 4. 并发"丢失更新"（read-modify-write 竞态）

- **现状**：所有 `data/*.json` 均为"读全文件 → 内存改 → 写全文件"，两个并发请求会互相覆盖对方写入。`writeFileAtomic` 只解决了**崩溃损坏**，未解决**并发丢失**。
- **建议**：进程内 per-file 互斥锁（改动小）；或迁到 SQLite（更彻底，运维模型与文件存储最接近）。
- **涉及**：`src/actions/admin/{movie,guestbook,moments,music}-actions.ts` 等所有读改写点。

### 5. `DEFAULT_ROLE_PERMISSIONS` 与磁盘 `role-permissions.json` 漂移

- **现状**：代码默认值 `src/constant/permissions.ts` 的 `user` 角色权限，与磁盘 `data/role-permissions.json` 不一致（文件里 `user` 多了 `users:create/update/delete/updateRole`）。
- **风险**：`resetToDefault` 后权限与当前部署实际生效配置不一致，行为不可预期。
- **建议**：明确以磁盘文件为准或统一默认值，并核对一次 `reset` 语义。

### 6. `User.permissions` 字段已无消费方（死数据）

- **现状**：P1-6 删除 `PermissionChecker` 后，per-user 的 `permissions`（canCreate/canRead/...）只剩透传，无任何代码读取。
- **建议**：从 `User`/`CreateUserRequest`/`UpdateUserRequest`/`UserResponse`（`src/store/user-store.ts`）及 `src/app/api/users/[id]/route.ts` PATCH 一并移除。

---

## P2 · 性能 / 架构

### 7. 影视/留言/碎碎念/音乐无分页，全量读+内存过滤

- **现状**：`getPublicMovies`、`getPublicGuestbook`、`getPublicMoments`、`getPublicMusic` 每次请求读整个 JSON 文件再在内存排序/过滤，数据量增长后成为瓶颈（博客/图库已有 `paginateItems` 分页）。
- **建议**：为这四个模块加分页或游标；数据量大后考虑 SQLite。

### 8. API 路由与 Server Actions 双入口重复

- **现状**：movies、mdx/gallery 走 `src/app/api/**` 路由，blog/guestbook/tags 等走 `src/actions/admin/**` action，同一数据两套入口、校验逻辑不一致。
- **风险**：维护成本高、攻击面翻倍，未来改动容易遗漏一处。
- **建议**：统一保留一种入口（推荐 Server Actions，`withActionPermission` 已统一包装）。

### 9. 模块级 `setInterval` 副作用

- **现状**：`src/lib/rate-limit.ts:21`、`src/store/session-store.ts:26` 在模块顶层挂定时器，serverless/多实例下每个实例都跑，且会让函数"活"着。
- **建议**：改为惰性清理（读写时顺带清理过期项），或去掉定时器。

---

## P3 · 代码质量 / 细节

### 10. MDX frontmatter 用字符串拼接（YAML 注入/格式破坏）

- **现状**：`src/app/[lang]/(admin)/admin/blog/blog-client.tsx` 用模板字符串拼 frontmatter，标题/描述里含 `'`、`:`、换行会破坏 YAML 甚至注入字段；编辑回填时也用正则解析。
- **建议**：改用 `gray-matter` 的 `stringify()`（项目已依赖该库）。

### 11. 留言板限流按昵称 key，可绕过

- **现状**：`src/actions/admin/guestbook-actions.ts` `submitGuestbook` 用 `guestbook:${nickname}` 做限流标识，换昵称即绕过，且无 IP 维度、无验证码。
- **建议**：按 IP 限流 + 轻量防刷（honeypot 字段或验证码）。

### 12. 手工校验、无 schema 库

- **现状**：所有输入校验是重复的 `if (!x || x.trim()...)`，运行时无法保证与 TS 类型一致。
- **建议**：引入 `zod` 统一校验输入。

### 13. `scripts/convert-to-webp.ts` 疑似 bug：写入 URL 而非 buffer

- **现状**：`scripts/convert-to-webp.ts:44` 执行 `fs.writeFile(targetPath, compressedBuffer.url)`，把 **URL 字符串**当文件内容写入，疑似应为 `compressedBuffer`（或对应 buffer 字段）。脚本每次运行会生成错误内容。
- **建议**：核对 `processAndSaveImage` 返回结构后修复。

### 14. 其他小问题

- **时间戳 ID 碰撞**：`guestbook-actions.ts`、`moments-actions.ts` 用 `Date.now().toString()` 当主键，同毫秒并发会撞。建议用 `crypto.randomUUID()`（`user-store.ts` 已在用）。
- **孤儿上传文件**：删除博客/图库时不清理已上传的缩略图与图片（`uploads/` 会残留无用文件）。建议删除时顺带清理。
- **ISO 字符串排序**：公开页按 `lastUpdated` ISO 字符串排序（如 `movie-actions.ts`），依赖格式一致，建议统一 `getTime()`。
