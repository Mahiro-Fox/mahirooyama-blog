import { ADMIN_DEFAULT_PASSWORD } from '@/constant/auth';
import { goFetch, withGoAuth } from '@/lib/server/api-client';

/**
 * 后台用户（admin_users）Store
 *
 * 只负责取数：每次读写都通过 goFetch 转发到 Go 后端 /api/admin/users。
 * 这些端点需要身份，调用方（Server Action）显式把 ctx 传入，方法内部用 withGoAuth
 * 透传 Authorization: Bearer <token>；页面/Route Handler 不传时退化为无身份请求。
 *
 * 类型定义见 src/types/user.ts。
 */
export const userStore = {
  // 获取所有用户
  async getAll(ctx?: ActionContext): Promise<UserResponse[]> {
    return goFetch<UserResponse[]>('/api/admin/users', withGoAuth(ctx));
  },

  // 根据ID获取用户
  async getById(id: string, ctx?: ActionContext): Promise<UserResponse | null> {
    try {
      return await goFetch<UserResponse>(
        `/api/admin/users/${encodeURIComponent(id)}`,
        withGoAuth(ctx)
      );
    } catch {
      return null;
    }
  },

  // 根据用户名获取用户（用于登录前的存在性检查）
  // 注意：Go 端没有公开按用户名查询的接口，这里通过 getAll 查找
  async getByUsername(
    username: string,
    ctx?: ActionContext
  ): Promise<UserResponse | null> {
    const users = await this.getAll(ctx);
    return users.find((u) => u.username === username) || null;
  },

  // 验证用户密码（登录用，由 Go 端校验）
  // 登录端点无需身份（此时尚未登录），故不接收 ctx
  async verifyPassword(
    username: string,
    password: string
  ): Promise<UserResponse | null> {
    try {
      const result = await goFetch<UserResponse>('/api/admin/users/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      return result;
    } catch {
      return null;
    }
  },

  // 创建用户
  async create(
    request: CreateUserRequest,
    ctx?: ActionContext
  ): Promise<UserResponse> {
    return goFetch<UserResponse>(
      '/api/admin/users',
      withGoAuth(ctx, {
        method: 'POST',
        body: JSON.stringify({
          username: request.username,
          password: request.password,
          role: request.role,
        }),
      })
    );
  },

  // 更新用户
  async update(
    id: string,
    request: UpdateUserRequest,
    ctx?: ActionContext
  ): Promise<UserResponse | null> {
    const body: Record<string, unknown> = {};
    if (request.username !== undefined) body.username = request.username;
    if (request.avatar !== undefined) body.avatar = request.avatar;
    if (request.role !== undefined) body.role = request.role;

    if (request.password !== undefined) {
      // 改密走专门的 password 端点
      await goFetch(
        `/api/admin/users/${encodeURIComponent(id)}/password`,
        withGoAuth(ctx, {
          method: 'PUT',
          body: JSON.stringify({ password: request.password }),
          parseJson: false,
        })
      );
    }

    // 没有字段需要更新时直接返回当前用户
    if (Object.keys(body).length === 0) {
      return this.getById(id, ctx);
    }

    try {
      return await goFetch<UserResponse>(
        `/api/admin/users/${encodeURIComponent(id)}`,
        withGoAuth(ctx, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    } catch {
      return null;
    }
  },

  // 删除用户
  async delete(id: string, ctx?: ActionContext): Promise<boolean> {
    try {
      await goFetch(
        `/api/admin/users/${encodeURIComponent(id)}`,
        withGoAuth(ctx, { method: 'DELETE', parseJson: false })
      );
      return true;
    } catch {
      return false;
    }
  },

  // 兼容旧接口：之前初始化默认 admin 账号
  // Go 后端通过 migrator 从 data/users.json 迁移默认账号，无需在此初始化
  async initialize(): Promise<void> {
    // no-op：默认账号由数据迁移带入
    void ADMIN_DEFAULT_PASSWORD;
  },
};
