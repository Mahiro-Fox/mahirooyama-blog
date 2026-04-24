import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { userStore, PermissionChecker } from '@/lib/user-store';

// PATCH /api/users/[id] - 更新用户（需要更新权限）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 获取目标用户
    const targetUser = await userStore.getById(id);
    if (!targetUser) {
      return NextResponse.json({ error: '目标用户不存在' }, { status: 404 });
    }

    // 权限检查：
    // 1. super_admin 可以修改任何用户
    // 2. 普通用户只能修改自己，且不能修改角色和权限
    const isSelf = currentUser.id === id;
    const isSuperAdmin = currentUser.role === 'super_admin';

    if (!isSuperAdmin) {
      // 普通用户检查更新权限
      if (!PermissionChecker.hasPermission(currentUser, 'update')) {
        return NextResponse.json({ error: '没有更新权限' }, { status: 403 });
      }

      // 普通用户只能修改自己
      if (!isSelf) {
        return NextResponse.json({ error: '只能修改自己的信息' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { username, password, role, permissions } = body;

    // 普通用户不能修改自己的角色和权限
    if (!isSuperAdmin && isSelf) {
      if (role !== undefined || permissions !== undefined) {
        return NextResponse.json({ error: '不能修改自己的角色和权限' }, { status: 403 });
      }
    }

    // 验证角色值
    if (role && !['super_admin', 'user'].includes(role)) {
      return NextResponse.json({ error: '无效的角色类型' }, { status: 400 });
    }

    const updatedUser = await userStore.update(id, {
      username,
      password,
      role,
      permissions,
    });

    return NextResponse.json({
      success: true,
      message: '用户更新成功',
      user: updatedUser,
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    const errorMessage = error instanceof Error ? error.message : '更新用户失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/users/[id] - 删除用户（需要删除权限，仅super_admin）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 检查删除权限
    if (!PermissionChecker.hasPermission(currentUser, 'delete')) {
      return NextResponse.json({ error: '没有删除权限' }, { status: 403 });
    }

    // 仅 super_admin 可以删除用户
    if (currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: '只有超级管理员可以删除用户' }, { status: 403 });
    }

    // 不能删除自己
    if (currentUser.id === id) {
      return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
    }

    const deleted = await userStore.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '用户删除成功',
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    const errorMessage = error instanceof Error ? error.message : '删除用户失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
