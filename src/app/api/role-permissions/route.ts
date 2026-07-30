import { rolePermissionStore } from '@/store/role-permission-store';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';

/**
 * GET /api/role-permissions
 * 获取所有角色权限配置
 * 需要 users:read 权限
 */
export async function GET() {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('users:read');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const permissions = await rolePermissionStore.getAll();
    const definitions = rolePermissionStore.getAllPermissionDefinitions();

    return NextResponse.json({
      permissions,
      definitions,
    });
  } catch (error) {
    console.error('获取角色权限配置失败:', error);
    return NextResponse.json(
      { error: '获取角色权限配置失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/role-permissions
 * 更新角色权限配置
 * 需要 users:updateRole 权限（仅超级管理员）
 */
export async function PUT(request: NextRequest) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('users:updateRole');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const body = await request.json();
    const { role, permissions } = body;

    if (!role || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: '缺少必要字段：role 和 permissions' },
        { status: 400 }
      );
    }

    // 不能修改 super_admin 的权限
    if (role === 'super_admin') {
      return NextResponse.json(
        { error: '不能修改超级管理员的权限' },
        { status: 400 }
      );
    }

    await rolePermissionStore.updateRole(role, permissions);

    return NextResponse.json({
      success: true,
      message: '角色权限更新成功',
      role,
      permissions,
    });
  } catch (error) {
    console.error('更新角色权限失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '更新角色权限失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/role-permissions/reset
 * 重置为默认配置（仅超级管理员）
 * 注意：由于 Next.js App Router 不支持这种路由结构，
 * 这里将重置逻辑放在 POST 的 reset action 中
 */
export async function POST(request: NextRequest) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('users:updateRole');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'reset') {
      await rolePermissionStore.resetToDefault();
      const permissions = await rolePermissionStore.getAll();

      return NextResponse.json({
        success: true,
        message: '角色权限已重置为默认配置',
        permissions,
      });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    console.error('重置角色权限失败:', error);
    const errorMessage =
      error instanceof Error ? error.message : '重置角色权限失败';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
