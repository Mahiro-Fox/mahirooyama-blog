import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/store/user-store';

import { verifyAuth } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/permissions';

// PATCH /api/users/[id] - 更新用户
// - super_admin 可以修改任何用户
// - 普通用户只能修改自己（users:updatePassword 权限）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取当前认证用户
    const authCheck = await verifyAuth();
    if (!authCheck.success) {
      return NextResponse.json({ error: authCheck.error }, { status: 401 });
    }

    const currentUser = authCheck;
    const isSelf = currentUser.userId === id;
    const isSuperAdmin = currentUser.role === 'super_admin';

    // 获取目标用户
    const targetUser = await userStore.getById(id);
    if (!targetUser) {
      return NextResponse.json({ error: '目标用户不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { username, password, role, permissions } = body;

    if (isSuperAdmin) {
      // super_admin 可以修改任何字段，包括角色和权限
      // 修改其他用户需要 users:update 权限
      if (!isSelf) {
        const permCheck = await requirePermission('users:update');
        if (!permCheck.allowed) {
          return permCheck.response;
        }
      }
    } else {
      // 普通用户只能修改自己
      if (!isSelf) {
        return NextResponse.json(
          { error: '只能修改自己的信息' },
          { status: 403 }
        );
      }

      // 普通用户只能修改密码，需要 users:updatePassword 权限
      if (
        username !== undefined ||
        role !== undefined ||
        permissions !== undefined
      ) {
        return NextResponse.json(
          { error: '不能修改用户名、角色和权限' },
          { status: 403 }
        );
      }

      if (!password) {
        return NextResponse.json({ error: '请提供新密码' }, { status: 400 });
      }

      const permCheck = await requirePermission('users:updatePassword');
      if (!permCheck.allowed) {
        return permCheck.response;
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
    const errorMessage =
      error instanceof Error ? error.message : '更新用户失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/users/[id] - 删除用户（需要 users:delete 权限，仅super_admin）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查删除权限
    const permissionCheck = await requirePermission('users:delete');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const currentUser = permissionCheck.user!;

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
    const errorMessage =
      error instanceof Error ? error.message : '删除用户失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
