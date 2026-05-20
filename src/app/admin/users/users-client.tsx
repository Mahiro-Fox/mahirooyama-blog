'use client';

import { useState } from 'react';
import {
  adminGetRolePermissions,
  adminResetRolePermissions,
  adminUpdateRolePermissions,
} from '@/actions/admin/role-permission-actions';
import {
  adminCreateUser,
  adminDeleteUser,
  adminGetUsers,
  adminUpdateUserPassword,
} from '@/actions/admin/user-actions';
import { Permission } from '@/constant';
import type { UserResponse } from '@/store/user-store';
import { formatDate } from '@/utils/utils';
import { KeyRound, Loader2, Shield, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Input } from '@/components/shadcn-ui/input';
import { Label } from '@/components/shadcn-ui/label';
import {
  AdminPageLayout,
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

interface CurrentUser {
  id: string;
  username: string;
  role: 'super_admin' | 'user';
}

interface PermissionDef {
  value: Permission;
  label: string;
  description: string;
}

interface PermissionGroup {
  group: string;
  permissions: PermissionDef[];
}

// 获取角色显示文本
const getRoleDisplay = (role: string) =>
  role === 'super_admin' ? '超级管理员' : '普通用户';

export default function UsersClient({
  initialUsers,
  currentUser,
}: {
  initialUsers: UserResponse[];
  currentUser: CurrentUser;
}) {
  const [users, setUsers] = useState<UserResponse[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // 权限编辑状态
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [permissionDefinitions, setPermissionDefinitions] = useState<
    PermissionGroup[]
  >([]);
  const [editingRole, setEditingRole] = useState<'user' | 'super_admin' | null>(
    null
  );
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(
    []
  );

  // 表单状态
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'super_admin' | 'user'>('user');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');

  const refreshUsers = async () => {
    setIsLoading(true);
    try {
      const result = await adminGetUsers();
      if (!result.success) {
        throw new Error('获取用户列表失败');
      }
      setUsers(result.users);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 创建用户
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await adminCreateUser({
        username: newUsername,
        password: newPassword,
        role: newRole,
      });

      if (!result.success) {
        throw new Error(result.error || '创建用户失败');
      }

      toast.success('用户创建成功');
      setCreateDialogOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      await refreshUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建用户失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开删除对话框
  const openDelete = (user: UserResponse) => {
    setDeletingUser(user);
    setIsDeleteDialogOpen(true);
  };

  // 执行删除
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsSubmitting(true);
    try {
      const result = await adminDeleteUser({ id: deletingUser.id });
      if (!result.success) {
        throw new Error(result.error || '删除用户失败');
      }
      toast.success('用户删除成功');
      setIsDeleteDialogOpen(false);
      setDeletingUser(null);
      await refreshUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除用户失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 修改密码
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editPassword) return;
    if (editPassword !== editConfirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminUpdateUserPassword({
        id: editingUser.id,
        password: editPassword,
      });

      if (!result.success) {
        throw new Error(result.error || '更新密码失败');
      }

      toast.success('密码更新成功');
      setEditDialogOpen(false);
      setEditingUser(null);
      setEditPassword('');
      setEditConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新密码失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取角色权限配置
  const fetchRolePermissions = async () => {
    try {
      const data = await adminGetRolePermissions();
      if (!data.success) {
        throw new Error('获取权限配置失败');
      }
      setPermissionDefinitions(data.definitions);
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取权限配置失败');
      return null;
    }
  };

  // 打开权限编辑对话框
  const openPermissionDialog = async (role: 'user' | 'super_admin') => {
    const data = await fetchRolePermissions();
    setEditingRole(role);
    if (data && role === 'user' && data.permissions[role]) {
      setSelectedPermissions(data.permissions[role]);
    } else {
      setSelectedPermissions([]);
    }
    setPermissionDialogOpen(true);
  };

  // 切换权限选择
  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  // 保存角色权限
  const handleSavePermissions = async () => {
    if (!editingRole) return;

    setIsSubmitting(true);
    try {
      const result = await adminUpdateRolePermissions({
        role: editingRole,
        permissions: selectedPermissions,
      });

      if (!result.success) {
        throw new Error(result.error || '保存权限配置失败');
      }

      toast.success('权限配置已保存');
      setPermissionDialogOpen(false);
      setEditingRole(null);
      setSelectedPermissions([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存权限配置失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重置为默认权限
  const handleResetPermissions = async () => {
    if (!confirm('确定要重置为默认权限配置吗？')) return;

    setIsSubmitting(true);
    try {
      const result = await adminResetRolePermissions();
      if (!result.success) {
        throw new Error(result.error || '重置权限配置失败');
      }
      toast.success('权限配置已重置为默认值');
      if (editingRole && result.permissions[editingRole]) {
        setSelectedPermissions(result.permissions[editingRole]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重置权限配置失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 自定义操作按钮渲染
  const renderActions = (user: UserResponse) => {
    const isSuperAdmin = currentUser.role === 'super_admin';
    const isSelf = user.id === currentUser.id;
    return (
      <div className="flex justify-end gap-2">
        {(isSuperAdmin || isSelf) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingUser(user);
              setEditPassword('');
              setEditConfirmPassword('');
              setEditDialogOpen(true);
            }}
          >
            修改密码
          </Button>
        )}
        {isSuperAdmin && !isSelf && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openDelete(user)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> 删除
          </Button>
        )}
      </div>
    );
  };

  // 表格列定义
  const columns: Column<UserResponse>[] = [
    {
      key: 'username',
      header: '用户名',
      render: (user) => (
        <div className="flex items-center gap-2">
          {user.role === 'super_admin' ? (
            <Shield className="h-4 w-4 text-blue-500" />
          ) : (
            <User className="h-4 w-4 text-gray-500" />
          )}
          <span className="font-medium">{user.username}</span>
          {user.id === currentUser.id && (
            <span className="bg-primary text-primary-foreground rounded px-2 py-0.5 text-xs">
              我
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: '角色',
      render: (user) => getRoleDisplay(user.role),
    },
    {
      key: 'lastUpdated',
      header: '更新时间',
      render: (user) => formatDate(user.lastUpdated),
    },
  ];

  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <>
      <AdminPageLayout
        title="用户列表"
        description="管理系统用户账号和权限"
        actions={[
          createRefreshAction(refreshUsers, isLoading),
          ...(isSuperAdmin
            ? [
                {
                  label: '修改权限',
                  icon: <KeyRound className="mr-2 h-4 w-4" />,
                  onClick: () => openPermissionDialog('user'),
                  variant: 'outline' as const,
                },
                createAddAction(() => setCreateDialogOpen(true), '创建用户'),
              ]
            : []),
        ]}
      >
        <DataTable
          data={users}
          columns={columns}
          isLoading={isLoading}
          loadingText="加载用户列表..."
          emptyText="暂无用户"
          keyExtractor={(user) => user.id}
          actions={{ custom: renderActions }}
        />
      </AdminPageLayout>

      {/* 权限说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>权限说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="h-5 w-5 text-blue-500" /> 超级管理员
                (super_admin)
              </div>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                <li>查看所有用户数据</li>
                <li>创建新用户</li>
                <li>修改任何用户信息</li>
                <li>删除用户（不能删除自己）</li>
                <li>管理所有内容</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <User className="h-5 w-5 text-gray-500" /> 普通用户 (user)
              </div>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                <li>查看用户列表</li>
                <li>创建新内容</li>
                <li>修改自己的密码</li>
                <li>⚠️ 默认禁止：修改他人信息、删除操作</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 创建用户对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新用户</DialogTitle>
            <DialogDescription>添加一个新的系统用户</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="请输入用户名"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">角色</Label>
              <select
                id="role"
                value={newRole}
                onChange={(e) =>
                  setNewRole(e.target.value as 'super_admin' | 'user')
                }
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="user">普通用户</option>
                <option value="super_admin">超级管理员</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}{' '}
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 修改密码对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>用户: {editingUser?.username}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="请输入新密码"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={editConfirmPassword}
                onChange={(e) => setEditConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingUser(null);
                  setEditPassword('');
                  setEditConfirmPassword('');
                }}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}{' '}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 - 使用通用组件 */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="确认删除"
        description={
          <>
            确定要删除用户 <strong>{deletingUser?.username}</strong>{' '}
            吗？此操作不可恢复。
          </>
        }
        onConfirm={handleDeleteUser}
        isDeleting={isSubmitting}
      />

      {/* 权限编辑对话框 */}
      <Dialog
        open={permissionDialogOpen}
        onOpenChange={setPermissionDialogOpen}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>修改角色权限</DialogTitle>
            <DialogDescription>
              配置 &quot;
              {editingRole === 'super_admin' ? '超级管理员' : '普通用户'}&quot;
              角色的权限
              {editingRole === 'super_admin' && (
                <span className="text-destructive mt-1 block">
                  超级管理员始终拥有所有权限
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {editingRole === 'user' &&
              permissionDefinitions.map((group) => (
                <div key={group.group} className="space-y-3">
                  <h4 className="text-muted-foreground border-b pb-2 text-sm font-medium">
                    {group.group}
                  </h4>
                  <div className="grid gap-2">
                    {group.permissions.map((perm) => (
                      <label
                        key={perm.value}
                        className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg p-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.value)}
                          onChange={() => togglePermission(perm.value)}
                          className="text-primary focus:ring-primary mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {perm.label}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {perm.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPermissionDialogOpen(false)}
            >
              取消
            </Button>
            {editingRole === 'user' && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetPermissions}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}{' '}
                重置默认
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSavePermissions}
              disabled={isSubmitting || editingRole === 'super_admin'}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}{' '}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
