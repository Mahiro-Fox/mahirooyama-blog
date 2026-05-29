'use server';

import fs from 'fs/promises';
import path from 'path';
import { AVATAR_DIR } from '@/constant/dir';
import {
  withActionPermission,
  type ActionResponse,
} from '@/utils/action-response';
import { processAndSaveImage } from '@/utils/image-utils';
import { createLogger } from '@/utils/logger';

import { verifyAuth } from '@/lib/admin-auth';
import { serverActionRateLimiter } from '@/lib/rate-limit';
import { UserResponse, UserRole, userStore } from '@/store/user-store';
import { requirePermission } from '@/lib/permissions';

const logger = createLogger('UserActions');

export async function adminGetUsers(): Promise<ActionResponse<UserResponse[]>> {
  return withActionPermission('users:read', async () => {
    const users = await userStore.getAll();
    return { success: true, data: users };
  });
}

export async function adminCreateUser(input: {
  username: string;
  password: string;
  role: UserRole;
}): Promise<ActionResponse<void>> {
  return withActionPermission('users:create', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`user:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    if (!input.username || !input.password || !input.role) {
      return { success: false, error: '缺少必要字段' };
    }

    if (!['super_admin', 'user'].includes(input.role)) {
      return { success: false, error: '无效的角色类型' };
    }

    await userStore.create({
      username: input.username,
      password: input.password,
      role: input.role,
    });

    logger.info('创建用户成功', { username: input.username, adminId: user.id });
    return { success: true, data: undefined };
  });
}

export async function adminUploadAvatar(
  formData: FormData
): Promise<ActionResponse<{ avatar: string; message: string }>> {
  try {
    // 1. 验证登录状态
    const authCheck = await verifyAuth();
    if (!authCheck.success) {
      return { success: false, error: '未登录' };
    }

    const userId = authCheck.userId as string;

    // 速率限制检查
    const rateLimit = await serverActionRateLimiter.check(`user:${userId}`);
    if (!rateLimit.success) {
      return {
        success: false,
        error: '操作过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }

    // 2. 获取用户信息
    const user = await userStore.getById(userId);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    // 3. 解析上传的文件
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return { success: false, error: '未提供头像文件' };
    }

    // 4. 验证文件类型
    if (!file.type.startsWith('image/')) {
      return { success: false, error: '只允许上传图片文件' };
    }

    // 6. 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: '图片大小不能超过 2MB' };
    }

    // 7. 读取文件并处理
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 8. 处理并保存图片 (头像固定 200x200)
    const result = await processAndSaveImage(buffer, {
      dir: 'images/avatar',
      fileName: `${userId}`,
      width: 200,
      height: 200,
      quality: 80,
    });

    // 9. 删除旧头像（如果不是默认头像）
    if (user.avatar && !user.avatar.includes('default')) {
      try {
        const oldFileName = path.basename(user.avatar);
        const oldFilePath = path.join(AVATAR_DIR, oldFileName);
        await fs.unlink(oldFilePath);
      } catch {
        // 忽略删除失败（文件可能不存在）
      }
    }

    // 10. 更新用户头像路径
    const avatarPath = result.url;
    await userStore.update(userId, { avatar: avatarPath });

    logger.info('更新头像成功', { userId });
    return {
      success: true,
      data: {
        avatar: avatarPath,
        message: '头像更新成功',
      },
    };
  } catch (error) {
    logger.error('头像上传失败', error);
    const errorMessage =
      error instanceof Error ? error.message : '头像上传失败';
    return { success: false, error: errorMessage };
  }
}

export async function adminDeleteUser(input: {
  id: string;
}): Promise<ActionResponse<void>> {
  return withActionPermission('users:delete', async (user) => {
    // 速率限制检查
    if (user.id) {
      const rateLimit = await serverActionRateLimiter.check(`user:${user.id}`);
      if (!rateLimit.success) {
        return {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetTime: rateLimit.resetTime,
        };
      }
    }

    const currentUser = user;

    if (currentUser.id === input.id) {
      return { success: false, error: '不能删除自己' };
    }

    const deleted = await userStore.delete(input.id);
    if (!deleted) {
      return { success: false, error: '用户不存在' };
    }

    logger.info('删除用户成功', { targetUserId: input.id, adminId: user.id });
    return { success: true, data: undefined };
  });
}

export async function adminUpdateUserPassword(input: {
  id: string;
  password: string;
}): Promise<ActionResponse<void>> {
  try {
    const authCheck = await verifyAuth();
    if (!authCheck.success) {
      return { success: false, error: 'unauthorized' };
    }

    const currentUser = authCheck;
    const isSelf = currentUser.userId === input.id;
    const isSuperAdmin = currentUser.role === 'super_admin';

    // 速率限制检查
    const rateLimit = await serverActionRateLimiter.check(
      `user:${currentUser.userId}`
    );
    if (!rateLimit.success) {
      return {
        success: false,
        error: '操作过于频繁，请稍后再试',
        resetTime: rateLimit.resetTime,
      };
    }

    if (!input.password) {
      return { success: false, error: '请提供新密码' };
    }

    if (isSuperAdmin) {
      // super_admin 修改其他用户密码需要 users:update 权限
      if (!isSelf) {
        const permCheck = await requirePermission('users:update');
        if (!permCheck.allowed) {
          return { success: false, error: 'unauthorized' };
        }
      }
    } else {
      // 普通用户只能修改自己密码
      if (!isSelf) {
        return { success: false, error: '只能修改自己的信息' };
      }

      const permCheck = await requirePermission('users:updatePassword');
      if (!permCheck.allowed) {
        return { success: false, error: 'unauthorized' };
      }
    }

    const updated = await userStore.update(input.id, {
      password: input.password,
    });
    if (!updated) {
      return { success: false, error: '目标用户不存在' };
    }

    logger.info('修改用户密码成功', {
      targetUserId: input.id,
      adminId: currentUser.userId,
    });
    return { success: true, data: undefined };
  } catch (error) {
    logger.error('修改用户密码失败', error, { targetUserId: input.id });
    return { success: false, error: '修改密码失败' };
  }
}
