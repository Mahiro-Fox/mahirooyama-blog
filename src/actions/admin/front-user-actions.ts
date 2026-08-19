'use server';

import { accountStore, type Account } from '@/store/account-store';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FrontUserActions');

/**
 * 前台用户管理 Server Actions
 *
 * 所有写操作走 `withActionPermission` 统一鉴权 + 权限校验，
 * 数据持久化由 Go 后端 `/api/admin/accounts/*` 完成，前端通过 `accountStore` 转发。
 */

// 读取列表
export async function adminGetFrontUsers(): Promise<
  ActionResponse<Account[]>
> {
  return withActionPermission('accounts:read', async (admin) => {
    try {
      const accounts = await accountStore.getAll();
      return { success: true, data: accounts };
    } catch (error) {
      logger.error('获取前台用户列表失败', error, { adminId: admin.id });
      return { success: false, error: '获取前台用户列表失败' };
    }
  });
}

// 创建前台用户
export async function adminCreateFrontUser(input: {
  username: string;
  password: string;
}): Promise<ActionResponse<Account>> {
  return withActionPermission('accounts:create', async (admin) => {
    if (admin.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `account:${admin.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    if (!input.username?.trim() || !input.password) {
      return { success: false, error: '用户名和密码不能为空' };
    }
    if (input.password.length < 6) {
      return { success: false, error: '密码长度不能少于 6 位' };
    }

    try {
      const account = await accountStore.create({
        username: input.username.trim(),
        password: input.password,
      });
      logger.info('创建前台用户成功', {
        username: input.username,
        adminId: admin.id,
      });
      return { success: true, data: account };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '创建前台用户失败';
      // goFetch 抛出的错误消息中包含 Go 后端返回的 409 状态码和中文错误体
      if (msg.includes('409')) {
        return {
          success: false,
          error: msg.includes('username')
            ? '用户名已被占用'
            : '邮箱已被占用',
        };
      }
      return { success: false, error: msg };
    }
  });
}

// 更新前台用户基本信息（用户名 / 邮箱）
export async function adminUpdateFrontUser(input: {
  id: string;
  username?: string;
  email?: string | null;
}): Promise<ActionResponse<Account>> {
  return withActionPermission('accounts:update', async (admin) => {
    if (!input.id) {
      return { success: false, error: '缺少用户 ID' };
    }

    if (admin.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `account:${admin.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    if (input.username !== undefined && !input.username.trim()) {
      return { success: false, error: '用户名不能为空' };
    }

    try {
      const updated = await accountStore.update(input.id, {
        username: input.username?.trim(),
        email: input.email,
      });
      if (!updated) {
        return { success: false, error: '前台用户不存在或更新失败' };
      }
      logger.info('更新前台用户成功', {
        targetId: input.id,
        adminId: admin.id,
      });
      return { success: true, data: updated };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '更新前台用户失败';
      if (msg.includes('409')) {
        return {
          success: false,
          error: msg.includes('username')
            ? '用户名已被占用'
            : '邮箱已被占用',
        };
      }
      return { success: false, error: msg };
    }
  });
}

// 修改前台用户密码
export async function adminUpdateFrontUserPassword(input: {
  id: string;
  password: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission('accounts:updatePassword', async (admin) => {
    if (!input.id) {
      return { success: false, error: '缺少用户 ID' };
    }
    if (!input.password) {
      return { success: false, error: '请提供新密码' };
    }
    if (input.password.length < 6) {
      return { success: false, error: '密码长度不能少于 6 位' };
    }

    if (admin.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `account:${admin.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    const ok = await accountStore.updatePassword(input.id, input.password);
    if (!ok) {
      return { success: false, error: '前台用户不存在或更新失败' };
    }
    logger.info('重置前台用户密码成功', {
      targetId: input.id,
      adminId: admin.id,
    });
    return { success: true, data: undefined };
  });
}

// 删除前台用户
export async function adminDeleteFrontUser(input: {
  id: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission('accounts:delete', async (admin) => {
    if (!input.id) {
      return { success: false, error: '缺少用户 ID' };
    }

    if (admin.id) {
      const rateLimit = await serverActionRateLimiter.check(
        `account:${admin.id}`
      );
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    const ok = await accountStore.delete(input.id);
    if (!ok) {
      return { success: false, error: '前台用户不存在或删除失败' };
    }
    logger.info('删除前台用户成功', {
      targetId: input.id,
      adminId: admin.id,
    });
    return { success: true, data: undefined };
  });
}
