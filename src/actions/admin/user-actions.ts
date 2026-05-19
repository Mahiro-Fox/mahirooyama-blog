'use server';

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import {
  userStore,
  type UserResponse,
  type UserRole,
} from '@/store/user-store';

import { requireAuth, requirePermission } from '@/lib/permissions';
import { AVATAR_DIR } from '@/constant/dir';

export async function adminGetUsers(): Promise<
  { success: true; users: UserResponse[] } | { success: false; error: string }
> {
  const permissionCheck = await requirePermission('users:read');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const users = await userStore.getAll();
  return { success: true, users };
}

export async function adminCreateUser(input: {
  username: string;
  password: string;
  role: UserRole;
}): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('users:create');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
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

  return { success: true };
}

export async function adminUploadAvatar(
  formData: FormData
): Promise<
  | { success: true; avatar: string; message: string }
  | { success: false; error: string }
> {
  try {
    // 1. 验证登录状态
    const authCheck = await requireAuth();
    if (!authCheck.allowed) {
      return { success: false, error: '未登录' };
    }

    const userId = authCheck.user!.id;

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

    // 5. 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: '图片大小不能超过 2MB' };
    }

    // 6. 确保头像目录存在
    try {
      await fs.access(AVATAR_DIR);
    } catch {
      await fs.mkdir(AVATAR_DIR, { recursive: true });
    }

    // 7. 读取文件并处理
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 8. 生成唯一文件名
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}.webp`;
    const filePath = path.join(AVATAR_DIR, fileName);

    // 9. 使用 sharp 压缩并转换为 WebP
    await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toFile(filePath);

    // 10. 删除旧头像（如果不是默认头像）
    if (user.avatar && !user.avatar.includes('default')) {
      try {
        const oldFileName = path.basename(user.avatar);
        const oldFilePath = path.join(AVATAR_DIR, oldFileName);
        await fs.unlink(oldFilePath);
      } catch {
        // 忽略删除失败（文件可能不存在）
      }
    }

    // 11. 更新用户头像路径
    const avatarPath = `/image/avatar/${fileName}`;
    await userStore.update(userId, { avatar: avatarPath });

    return {
      success: true,
      avatar: avatarPath,
      message: '头像更新成功',
    };
  } catch (error) {
    console.error('头像上传失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '头像上传失败';
    return { success: false, error: errorMessage };
  }
}

export async function adminDeleteUser(input: {
  id: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const permissionCheck = await requirePermission('users:delete');
  if (!permissionCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const currentUser = permissionCheck.user!;

  if (currentUser.id === input.id) {
    return { success: false, error: '不能删除自己' };
  }

  const deleted = await userStore.delete(input.id);
  if (!deleted) {
    return { success: false, error: '用户不存在' };
  }

  return { success: true };
}

export async function adminUpdateUserPassword(input: {
  id: string;
  password: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const authCheck = await requireAuth();
  if (!authCheck.allowed) {
    return { success: false, error: 'unauthorized' };
  }

  const currentUser = authCheck.user!;
  const isSelf = currentUser.id === input.id;
  const isSuperAdmin = currentUser.role === 'super_admin';

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

  return { success: true };
}
