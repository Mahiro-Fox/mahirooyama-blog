'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  LogOut,
  Plus,
  Shield,
  Trash2,
  User,
  UserCog,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn-ui/table';
import Link from 'next/link';

interface UserData {
  id: string;
  username: string;
  role: 'super_admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

interface CurrentUser {
  id: string;
  username: string;
  role: 'super_admin' | 'user';
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单状态
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'super_admin' | 'user'>('user');
  const [editPassword, setEditPassword] = useState('');

  // 验证登录并获取当前用户
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify');
        if (!response.ok) {
          router.push('/admin/login?redirect=/admin/users');
          return;
        }
        const data = await response.json();
        setCurrentUser({
          id: data.userId || '',
          username: data.username || '',
          role: data.role || 'user',
        });
      } catch {
        router.push('/admin/login?redirect=/admin/users');
      }
    };
    checkAuth();
  }, [router]);

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login?redirect=/admin/users');
          return;
        }
        throw new Error('获取用户列表失败');
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  // 登出
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // 忽略错误
    }
    router.push('/admin/login');
    toast.success('已登出');
  };

  // 创建用户
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '创建用户失败');
      }

      toast.success('用户创建成功');
      setCreateDialogOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建用户失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '删除用户失败');
      }

      toast.success('用户删除成功');
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除用户失败');
    }
  };

  // 修改密码
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: editPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '修改密码失败');
      }

      toast.success('密码修改成功');
      setEditDialogOpen(false);
      setEditingUser(null);
      setEditPassword('');
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '修改密码失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 获取角色显示文本
  const getRoleDisplay = (role: string) => {
    return role === 'super_admin' ? '超级管理员' : '普通用户';
  };

  // 获取角色图标
  const getRoleIcon = (role: string) => {
    return role === 'super_admin' ? (
      <Shield className="h-4 w-4 text-blue-500" />
    ) : (
      <User className="h-4 w-4 text-gray-500" />
    );
  };

  if (loading) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = currentUser?.role === 'super_admin';

  return (
    <div className="bg-muted/30 min-h-screen">
      {/* 头部 */}
      <header className="bg-background border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回
              </Button>
            </Link>
            <h1 className="text-xl font-bold">用户管理</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              当前用户: {currentUser?.username} ({getRoleDisplay(currentUser?.role || '')})
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              登出
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="mx-auto max-w-6xl p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>用户列表</CardTitle>
              <CardDescription>管理系统用户账号和权限</CardDescription>
            </div>
            {isSuperAdmin && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                创建用户
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        {user.username}
                        {user.id === currentUser?.id && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                            我
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleDisplay(user.role)}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>{formatDate(user.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* 用户可以修改自己的密码 */}
                        {user.id === currentUser?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setEditDialogOpen(true);
                            }}
                          >
                            <UserCog className="mr-2 h-4 w-4" />
                            修改密码
                          </Button>
                        )}
                        {/* super_admin 可以删除其他用户 */}
                        {isSuperAdmin && user.id !== currentUser?.id && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 权限说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>权限说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Shield className="h-5 w-5 text-blue-500" />
                  超级管理员 (super_admin)
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
                  <User className="h-5 w-5 text-gray-500" />
                  普通用户 (user)
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
      </main>

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
                onChange={(e) => setNewRole(e.target.value as 'super_admin' | 'user')}
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
                )}
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingUser(null);
                  setEditPassword('');
                }}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
