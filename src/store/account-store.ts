import { goFetch, withGoAuth } from '@/lib/server/api-client';
import type { ActionContext } from '@/types/auth';
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
} from '@/types/account';

/**
 * 前台用户（accounts）Store
 *
 * 数据持久化由 Go 后端管理：
 * - 公开端点：POST /api/accounts（注册）、POST /api/accounts/login、GET /api/accounts/:id
 * - 管理端：GET/POST /api/admin/accounts、GET/PUT/DELETE /api/admin/accounts/:id、PUT /api/admin/accounts/:id/password
 *
 * 本 Store 仅封装管理端调用，供后台「前台用户管理」页面使用。
 * 管理端端点需要身份，调用方（Server Action）显式把 ctx 传入，方法内部用 withGoAuth 透传。
 * 前台登录/注册流程直接走 /api/user/auth 与 /api/accounts，不经过此 Store。
 *
 * 类型定义见 src/types/account.ts。
 */

function encodeId(id: string): string {
  return encodeURIComponent(id);
}

export const accountStore = {
  /** 获取全部前台账户 */
  async getAll(ctx?: ActionContext): Promise<Account[]> {
    return goFetch<Account[]>('/api/admin/accounts', withGoAuth(ctx));
  },

  /** 按 ID 获取前台账户 */
  async getById(id: string, ctx?: ActionContext): Promise<Account | null> {
    try {
      return await goFetch<Account>(
        `/api/admin/accounts/${encodeId(id)}`,
        withGoAuth(ctx)
      );
    } catch {
      return null;
    }
  },

  /** 创建前台账户（管理端） */
  async create(
    request: CreateAccountRequest,
    ctx?: ActionContext
  ): Promise<Account> {
    return goFetch<Account>(
      '/api/admin/accounts',
      withGoAuth(ctx, {
        method: 'POST',
        body: JSON.stringify({
          username: request.username,
          password: request.password,
        }),
      })
    );
  },

  /** 更新前台账户基本信息（username / email） */
  async update(
    id: string,
    request: UpdateAccountRequest,
    ctx?: ActionContext
  ): Promise<Account | null> {
    const body: Record<string, unknown> = {};
    if (request.username !== undefined) body.username = request.username;
    // email 显式传 null 表示清空
    if (request.email !== undefined) body.email = request.email;

    if (Object.keys(body).length === 0) {
      return this.getById(id, ctx);
    }

    try {
      return await goFetch<Account>(
        `/api/admin/accounts/${encodeId(id)}`,
        withGoAuth(ctx, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      );
    } catch {
      return null;
    }
  },

  /** 修改前台账户密码 */
  async updatePassword(
    id: string,
    password: string,
    ctx?: ActionContext
  ): Promise<boolean> {
    try {
      await goFetch(
        `/api/admin/accounts/${encodeId(id)}/password`,
        withGoAuth(ctx, {
          method: 'PUT',
          body: JSON.stringify({ password }),
          parseJson: false,
        })
      );
      return true;
    } catch {
      return false;
    }
  },

  /** 删除前台账户 */
  async delete(id: string, ctx?: ActionContext): Promise<boolean> {
    try {
      await goFetch(
        `/api/admin/accounts/${encodeId(id)}`,
        withGoAuth(ctx, { method: 'DELETE', parseJson: false })
      );
      return true;
    } catch {
      return false;
    }
  },
};