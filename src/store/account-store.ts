import { goFetch } from '@/lib/server/api-client';

/**
 * 前台用户（accounts）Store
 *
 * 数据持久化由 Go 后端管理：
 * - 公开端点：POST /api/accounts（注册）、POST /api/accounts/login、GET /api/accounts/:id
 * - 管理端：GET/POST /api/admin/accounts、GET/PUT/DELETE /api/admin/accounts/:id、PUT /api/admin/accounts/:id/password
 *
 * 本 Store 仅封装管理端调用，供后台「前台用户管理」页面使用。
 * 前台登录/注册流程直接走 /api/user/auth 与 /api/accounts，不经过此 Store。
 */

export type AccountProvider = 'credentials' | 'google';

export interface Account {
  id: string;
  username: string;
  email: string | null;
  provider: AccountProvider;
  createdAt: string;
  lastUpdated: string;
}

export interface CreateAccountRequest {
  username: string;
  password: string;
}

export interface UpdateAccountRequest {
  username?: string;
  email?: string | null;
}

export interface AccountResponse {
  id: string;
  username: string;
  email: string | null;
  provider: AccountProvider;
  createdAt: string;
  lastUpdated: string;
}

function encodeId(id: string): string {
  return encodeURIComponent(id);
}

export const accountStore = {
  /** 获取全部前台账户 */
  async getAll(): Promise<Account[]> {
    return goFetch<Account[]>('/api/admin/accounts');
  },

  /** 按 ID 获取前台账户 */
  async getById(id: string): Promise<Account | null> {
    try {
      return await goFetch<Account>(
        `/api/admin/accounts/${encodeId(id)}`
      );
    } catch {
      return null;
    }
  },

  /** 创建前台账户（管理端） */
  async create(request: CreateAccountRequest): Promise<Account> {
    return goFetch<Account>('/api/admin/accounts', {
      method: 'POST',
      body: JSON.stringify({
        username: request.username,
        password: request.password,
      }),
    });
  },

  /** 更新前台账户基本信息（username / email） */
  async update(
    id: string,
    request: UpdateAccountRequest
  ): Promise<Account | null> {
    const body: Record<string, unknown> = {};
    if (request.username !== undefined) body.username = request.username;
    // email 显式传 null 表示清空
    if (request.email !== undefined) body.email = request.email;

    if (Object.keys(body).length === 0) {
      return this.getById(id);
    }

    try {
      return await goFetch<Account>(
        `/api/admin/accounts/${encodeId(id)}`,
        {
          method: 'PUT',
          body: JSON.stringify(body),
        }
      );
    } catch {
      return null;
    }
  },

  /** 修改前台账户密码 */
  async updatePassword(id: string, password: string): Promise<boolean> {
    try {
      await goFetch(`/api/admin/accounts/${encodeId(id)}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
        parseJson: false,
      });
      return true;
    } catch {
      return false;
    }
  },

  /** 删除前台账户 */
  async delete(id: string): Promise<boolean> {
    try {
      await goFetch(`/api/admin/accounts/${encodeId(id)}`, {
        method: 'DELETE',
        parseJson: false,
      });
      return true;
    } catch {
      return false;
    }
  },
};
