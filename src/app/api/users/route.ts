import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { userStore, PermissionChecker } from '@/lib/user-store';

// GET /api/users - 获取所有用户（需要读取权限）
export async function GET(request: NextRequest) {
  try {
    // 验证登录
    const payload = await verifyAuth();
    if (!payload) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取当前用户信息
    const currentUser = await userStore.getById(payload.userId as string);
    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 检查读取权限
    if (!PermissionChecker.hasPermission(currentUser, 'read')) {
      return NextResponse.json({ error: '没有查看权限' }, { status: 403 });
    }

    const users = await userStore.getAll();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

// POST /api/users - 创建用户（需要创建权限，仅super_admin）
export async function POST(request: NextRequest) {
  try {
    // 验证登录
    const payload = await verifyAuth();
    if (!payload) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取当前用户信息
    const currentUser = await userStore.getById(payload.userId as string);
    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 检查创建权限
    if (!PermissionChecker.hasPermission(currentUser, 'create')) {
      return NextResponse.json({ error: '没有创建权限' }, { status: 403 });
    }

    // 仅 super_admin 可以创建用户
    if (currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: '只有超级管理员可以创建用户' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, role, permissions } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    // 验证角色值
    if (!['super_admin', 'user'].includes(role)) {
      return NextResponse.json({ error: '无效的角色类型' }, { status: 400 });
    }

    const newUser = await userStore.create({
      username,
      password,
      role,
      permissions,
    });

    return NextResponse.json({
      success: true,
      message: '用户创建成功',
      user: newUser,
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    const errorMessage = error instanceof Error ? error.message : '创建用户失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
