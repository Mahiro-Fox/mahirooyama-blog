import { userStore } from '@/store/user-store';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';

// GET /api/users - 获取所有用户（需要 users:read 权限）
export async function GET() {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('users:read');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const users = await userStore.getAll();
    return NextResponse.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

// POST /api/users - 创建用户（需要 users:create 权限，仅super_admin）
export async function POST(request: NextRequest) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('users:create');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
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
    const errorMessage =
      error instanceof Error ? error.message : '创建用户失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
