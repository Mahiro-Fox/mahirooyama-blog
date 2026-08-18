import { ADMIN_DEFAULT_PASSWORD } from '@/constant/auth';
import { goFetch } from '@/lib/server/api-client';

// 用户角色类型
export type UserRole = 'super_admin' | 'user';

// 用户数据接口（含密码哈希，仅服务端使用）
export interface User {
  id: string;
  username: string;
  avatar: string;
  passwordHash: string;
  role: UserRole;
  lastUpdated: string;
  mustChangePassword?: boolean;
}

// 创建用户请求接口
export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  mustChangePassword?: boolean;
}

// 更新用户请求接口
export interface UpdateUserRequest {
  username?: string;
  password?: string;
  avatar?: string;
  role?: UserRole;
  mustChangePassword?: boolean;
}

// 用户响应（不含密码）
export interface UserResponse {
  id: string;
  username: string;
  avatar: string;
  role: UserRole;
  lastUpdated: string;
  mustChangePassword?: boolean;
}

// Go 后端返回的 AdminUser（passwordHash 通过 json:"-" 不会返回，因此前端拿不到哈希）
// 但登录/校验密码必须由 Go 完成，前端不再保留 passwordHash。

export const userStore = {
  // 获取所有用户
  async getAll(): Promise<UserResponse[]> {
    return goFetch<UserResponse[]>('/api/admin/users');
  },

  // 根据ID获取用户
  async getById(id: string): Promise<UserResponse | null> {
    try {
      return await goFetch<UserResponse>(
        `/api/admin/users/${encodeURIComponent(id)}`
      );
    } catch {
      return null;
    }
  },

  // 根据用户名获取用户（用于登录前的存在性检查）
  // 注意：Go 端没有公开按用户名查询的接口，这里通过 getAll 查找
  async getByUsername(username: string): Promise<UserResponse | null> {
    const users = await this.getAll();
    return users.find((u) => u.username === username) || null;
  },

  // 验证用户密码（登录用，由 Go 端校验）
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
  async create(request: CreateUserRequest): Promise<UserResponse> {
    return goFetch<UserResponse>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        username: request.username,
        password: request.password,
        role: request.role,
      }),
    });
  },

  // 更新用户
  async update(
    id: string,
    request: UpdateUserRequest
  ): Promise<UserResponse | null> {
    const body: Record<string, unknown> = {};
    if (request.username !== undefined) body.username = request.username;
    if (request.avatar !== undefined) body.avatar = request.avatar;
    if (request.role !== undefined) body.role = request.role;

    if (request.password !== undefined) {
      // 改密走专门的 password 端点
      await goFetch(`/api/admin/users/${encodeURIComponent(id)}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: request.password }),
        parseJson: false,
      });
    }

    // 没有字段需要更新时直接返回当前用户
    if (Object.keys(body).length === 0) {
      return this.getById(id);
    }

    try {
      return await goFetch<UserResponse>(
        `/api/admin/users/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      );
    } catch {
      return null;
    }
  },

  // 删除用户
  async delete(id: string): Promise<boolean> {
    try {
      await goFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        parseJson: false,
      });
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
