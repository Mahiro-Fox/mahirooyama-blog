import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { AVATAR_DIR } from '@/constant/dir';
import { userStore } from '@/store/user-store';
import { ensureDirectory } from '@/utils/file-utils';
import { processAndSaveImage } from '@/utils/image-utils';

import { verifyAuth } from '@/lib/auth';

// POST /api/users/avatar - 上传用户头像
export async function POST(request: NextRequest) {
  try {
    // 1. 验证登录状态
    const payload = await verifyAuth();
    if (!payload.success) {
      return NextResponse.json({ error: payload.error }, { status: 401 });
    }

    const userId = payload.userId as string;
    if (!userId) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    // 2. 获取用户信息
    const user = await userStore.getById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 3. 解析上传的文件
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: '未提供头像文件' }, { status: 400 });
    }

    // 4. 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '只允许上传图片文件' },
        { status: 400 }
      );
    }

    // 5. 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: '图片大小不能超过 2MB' },
        { status: 400 }
      );
    }

    // 6. 确保头像目录存在
    await ensureDirectory(AVATAR_DIR);

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

    return NextResponse.json({
      success: true,
      avatar: avatarPath,
      message: '头像更新成功',
    });
  } catch (error) {
    console.error('头像上传失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '头像上传失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
