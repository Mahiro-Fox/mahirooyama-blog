import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/store/user-store';
import sharp from 'sharp';

import { verifyAuth } from '@/lib/auth';

const AVATAR_DIR = path.join(process.cwd(), 'public', 'image', 'avatar');

// POST /api/users/avatar - 上传用户头像
export async function POST(request: NextRequest) {
  try {
    // 1. 验证登录状态
    const payload = await verifyAuth();
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
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
