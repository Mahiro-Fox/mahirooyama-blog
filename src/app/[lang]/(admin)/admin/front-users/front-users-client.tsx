'use client';

import type { Account, AccountProvider } from '@/store/account-store';
import {
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Shield,
  Trash2,
  User,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  adminCreateFrontUser,
  adminDeleteFrontUser,
  adminGetFrontUsers,
  adminUpdateFrontUser,
  adminUpdateFrontUserPassword,
} from '@/actions/admin/front-user-actions';
import {
  AdminPageLayout,
  createAddAction,
  createRefreshAction,
} from '@/components/admin/admin-page-layout';
import { Column, DataTable } from '@/components/admin/data-table';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
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
import { formatDate } from '@/utils/utils';

interface CurrentUser {
  id: string;
  username: string;
  role: 'super_admin' | 'user';
}

// 登录来源显示
const getProviderDisplay = (provider: AccountProvider) =>
  provider === 'google' ? 'Google' : '账号密码';

// === 前台用户列表 ===
function FrontUsersList({
  accounts,
  isLoading,
  onRefresh,
  onCreateAccount,
  onEditAccount,
  onEditPassword,
  onDelete,
}: {
  accounts: Account[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateAccount: () => void;
  onEditAccount: (account: Account) => void;
  onEditPassword: (account: Account) => void;
  onDelete: (account: Account) => void;
}) {
  const renderActions = (account: Account) => (
    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEditAccount(account)}
      >
        <Pencil className="mr-2 h-4 w-4" /> 编辑
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEditPassword(account)}
      >
        <KeyRound className="mr-2 h-4 w-4" /> 改密
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => onDelete(account)}
      >
        <Trash2 className="mr-2 h-4 w-4" /> 删除
      </Button>
    </div>
  );

  const columns: Column<Account>[] = [
    {
      key: 'username',
      header: '用户名',
      render: (account) => (
        <div className="flex items-center gap-2">
          <UserCircle className="h-8 w-8 text-muted-foreground" />
          <div>
            <div className="font-medium">{account.username}</div>
            <div className="text-muted-foreground text-xs">
              {account.id.slice(0, 8)}…
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: '邮箱',
      render: (account) =>
        account.email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{account.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: 'provider',
      header: '登录来源',
      render: (account) => {
        const isOAuth = account.provider === 'google';
        return (
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
              isOAuth
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {isOAuth && <Shield className="h-3 w-3" />}
            {getProviderDisplay(account.provider)}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: '注册时间',
      render: (account) => (
        <span className="text-sm">{formatDate(account.createdAt)}</span>
      ),
    },
    {
      key: 'lastUpdated',
      header: '更新时间',
      render: (account) => (
        <span className="text-sm">{formatDate(account.lastUpdated)}</span>
      ),
    },
  ];

  return (
    <AdminPageLayout
      title="前台用户列表"
      description="管理前台注册用户账号（含账号密码与 OAuth 用户）"
      actions={[
        createRefreshAction(onRefresh, isLoading),
        createAddAction(onCreateAccount, '创建前台用户'),
      ]}
    >
      <DataTable
        data={accounts}
        columns={columns}
        isLoading={isLoading}
        loadingText="加载前台用户列表..."
        emptyText="暂无前台用户"
        keyExtractor={(account) => account.id}
        actions={{ custom: renderActions }}
        virtual={true}
        virtualOptions={{
          estimateSize: 56,
          maxHeight: '65vh',
        }}
      />
    </AdminPageLayout>
  );
}

// === 说明卡片 ===
function ProviderInfoCard() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>用户类型说明</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <User className="h-5 w-5 text-gray-500" /> 账号密码 (credentials)
            </div>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>用户名 + 密码注册</li>
              <li>可修改用户名、邮箱、密码</li>
              <li>管理员可重置密码</li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <Shield className="h-5 w-5 text-blue-500" /> Google OAuth
            </div>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>通过 Google 账号登录</li>
              <li>不支持修改用户名（与第三方身份绑定）</li>
              <li>可修改邮箱或删除账户</li>
              <li>密码字段为空，无法重置</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// === 创建前台用户对话框 ===
function CreateAccountDialog({
  open,
  onOpenChange,
  isSubmitting,
  newUsername,
  setNewUsername,
  newPassword,
  setNewPassword,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  newUsername: string;
  setNewUsername: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建前台用户</DialogTitle>
          <DialogDescription>
            由管理员直接创建一个账号密码登录的前台用户。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 位"
              required
              autoComplete="new-password"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
  );
}

// === 编辑基本信息对话框（用户名 / 邮箱） ===
function EditAccountDialog({
  open,
  onOpenChange,
  isSubmitting,
  editingAccount,
  editUsername,
  setEditUsername,
  editEmail,
  setEditEmail,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  editingAccount: Account | null;
  editUsername: string;
  setEditUsername: (value: string) => void;
  editEmail: string;
  setEditEmail: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const isOAuth = editingAccount?.provider === 'google';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑前台用户</DialogTitle>
          <DialogDescription>
            用户: {editingAccount?.username}
            {isOAuth && (
              <span className="text-destructive mt-1 block">
                OAuth 账户不支持修改用户名
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username">用户名</Label>
            <Input
              id="edit-username"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              disabled={isOAuth}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">邮箱</Label>
            <Input
              id="edit-email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="留空表示无邮箱"
            />
            <p className="text-muted-foreground text-xs">
              留空会清空当前邮箱。
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
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
  );
}

// === 修改密码对话框 ===
function EditPasswordDialog({
  open,
  onOpenChange,
  isSubmitting,
  editingAccount,
  editPassword,
  setEditPassword,
  editConfirmPassword,
  setEditConfirmPassword,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  editingAccount: Account | null;
  editPassword: string;
  setEditPassword: (value: string) => void;
  editConfirmPassword: string;
  setEditConfirmPassword: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const isOAuth = editingAccount?.provider === 'google';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置前台用户密码</DialogTitle>
          <DialogDescription>
            用户: {editingAccount?.username}
            {isOAuth && (
              <span className="text-destructive mt-1 block">
                OAuth 账户没有密码，无法重置
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fp-new-password">新密码</Label>
            <Input
              id="fp-new-password"
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="至少 6 位"
              required
              disabled={isOAuth}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fp-confirm-password">确认密码</Label>
            <Input
              id="fp-confirm-password"
              type="password"
              value={editConfirmPassword}
              onChange={(e) => setEditConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              required
              disabled={isOAuth}
              autoComplete="new-password"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isOAuth}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}{' '}
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// === 删除确认对话框 ===
function DeleteAccountDialog({
  open,
  onOpenChange,
  deletingAccount,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletingAccount: Account | null;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <DeleteConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="确认删除"
      description={
        <>
          确定要删除前台用户 <strong>{deletingAccount?.username}</strong>{' '}
          吗？此操作不可恢复，相关会话也会失效。
        </>
      }
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}

export default function FrontUsersClient({
  initialAccounts,
  currentUser: _currentUser,
}: {
  initialAccounts: Account[];
  currentUser: CurrentUser;
}) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 创建对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 编辑基本信息对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // 修改密码对话框
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordEditingAccount, setPasswordEditingAccount] =
    useState<Account | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');

  // 删除对话框
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const refreshAccounts = async () => {
    setIsLoading(true);
    try {
      const result = await adminGetFrontUsers();
      if (!result.success) {
        throw new Error(result.error || '获取前台用户列表失败');
      }
      setAccounts(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '获取前台用户列表失败'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 创建前台用户
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await adminCreateFrontUser({
        username: newUsername,
        password: newPassword,
      });
      if (!result.success) {
        throw new Error(result.error || '创建前台用户失败');
      }
      toast.success('前台用户创建成功');
      setCreateDialogOpen(false);
      setNewUsername('');
      setNewPassword('');
      await refreshAccounts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '创建前台用户失败'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开编辑基本信息对话框
  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setEditUsername(account.username);
    setEditEmail(account.email ?? '');
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingAccount(null);
    setEditUsername('');
    setEditEmail('');
  };

  // 提交编辑基本信息
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const isOAuth = editingAccount.provider === 'google';
    const trimmedEmail = editEmail.trim();

    // 计算变更字段
    const updates: { username?: string; email?: string | null } = {};
    if (!isOAuth && editUsername.trim() !== editingAccount.username) {
      updates.username = editUsername.trim();
    }
    if (trimmedEmail !== (editingAccount.email ?? '')) {
      updates.email = trimmedEmail === '' ? null : trimmedEmail;
    }

    if (Object.keys(updates).length === 0) {
      toast.info('未检测到变更');
      closeEditDialog();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminUpdateFrontUser({
        id: editingAccount.id,
        ...updates,
      });
      if (!result.success) {
        throw new Error(result.error || '更新前台用户失败');
      }
      toast.success('前台用户信息已更新');
      closeEditDialog();
      await refreshAccounts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '更新前台用户失败'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开修改密码对话框
  const openPasswordDialog = (account: Account) => {
    setPasswordEditingAccount(account);
    setEditPassword('');
    setEditConfirmPassword('');
    setPasswordDialogOpen(true);
  };

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordEditingAccount(null);
    setEditPassword('');
    setEditConfirmPassword('');
  };

  // 提交修改密码
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordEditingAccount) return;
    if (editPassword !== editConfirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (editPassword.length < 6) {
      toast.error('密码长度不能少于 6 位');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminUpdateFrontUserPassword({
        id: passwordEditingAccount.id,
        password: editPassword,
      });
      if (!result.success) {
        throw new Error(result.error || '重置密码失败');
      }
      toast.success('前台用户密码已重置');
      closePasswordDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重置密码失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开删除对话框
  const openDeleteDialog = (account: Account) => {
    setDeletingAccount(account);
    setIsDeleteDialogOpen(true);
  };

  // 执行删除
  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    setIsSubmitting(true);
    try {
      const result = await adminDeleteFrontUser({
        id: deletingAccount.id,
      });
      if (!result.success) {
        throw new Error(result.error || '删除前台用户失败');
      }
      toast.success('前台用户删除成功');
      setIsDeleteDialogOpen(false);
      setDeletingAccount(null);
      await refreshAccounts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '删除前台用户失败'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FrontUsersList
        accounts={accounts}
        isLoading={isLoading}
        onRefresh={refreshAccounts}
        onCreateAccount={() => setCreateDialogOpen(true)}
        onEditAccount={openEditDialog}
        onEditPassword={openPasswordDialog}
        onDelete={openDeleteDialog}
      />

      <ProviderInfoCard />

      <CreateAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        isSubmitting={isSubmitting}
        newUsername={newUsername}
        setNewUsername={setNewUsername}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        onSubmit={handleCreateAccount}
      />

      <EditAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        isSubmitting={isSubmitting}
        editingAccount={editingAccount}
        editUsername={editUsername}
        setEditUsername={setEditUsername}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        onSubmit={handleUpdateAccount}
        onCancel={closeEditDialog}
      />

      <EditPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        isSubmitting={isSubmitting}
        editingAccount={passwordEditingAccount}
        editPassword={editPassword}
        setEditPassword={setEditPassword}
        editConfirmPassword={editConfirmPassword}
        setEditConfirmPassword={setEditConfirmPassword}
        onSubmit={handleUpdatePassword}
        onCancel={closePasswordDialog}
      />

      <DeleteAccountDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        deletingAccount={deletingAccount}
        onConfirm={handleDeleteAccount}
        isDeleting={isSubmitting}
      />
    </>
  );
}
