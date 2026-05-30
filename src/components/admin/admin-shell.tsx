'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminLogout } from '@/actions/admin/logout';
import { adminRevalidateAll } from '@/actions/admin/revalidate-all';
import { adminUploadAvatar } from '@/actions/admin/user-actions';
import type { UserRole } from '@/store/user-store';
import { Loader2, LogOut, Menu, RefreshCw, Shield, Upload } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import { adminRoutesConfig } from '@/config/config';
import { AnimatedThemeToggler } from '@/components/shadcn-ui/animated-theme-toggler';
import { Badge } from '@/components/shadcn-ui/badge';
import { Button } from '@/components/shadcn-ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/shadcn-ui/sheet';
import { OptimizedImage } from '@/components/shared/optimized-image';

interface CurrentUser {
  id: string;
  username: string;
  avatar: string;
  role: UserRole;
}
const GuestbookBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <Link href="/admin/guestbook">
      <Badge variant="destructive">{`留言未审核：${count}`}</Badge>
    </Link>
  );
};

export default function AdminShell({
  children,
  currentUser: initialUser,
  guestbookPendingCount = 0,
}: {
  children: React.ReactNode;
  currentUser: CurrentUser;
  guestbookPendingCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<CurrentUser>(initialUser);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);

  const { setTheme, resolvedTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);
  // 手动刷新缓存
  const handleRevalidate = async () => {
    setIsRevalidating(true);
    try {
      const result = await adminRevalidateAll();
      if (!result.success) {
        throw new Error(result.error || '刷新失败');
      }
      toast.success('所有页面缓存已刷新√');
      console.log('刷新结果:', result.results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刷新缓存失败');
    } finally {
      setIsRevalidating(false);
    }
  };

  // 登出
  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // 忽略错误
    }
    router.push('/login');
    toast.success('已登出');
  };

  // 修改头像
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const result = await adminUploadAvatar(formData);

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      setCurrentUser((prev) => ({ ...prev, avatar: result.data.avatar }));
      toast.success(result.data.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '头像上传失败');
    } finally {
      setIsUploadingAvatar(false);
      setAvatarMenuOpen(false);
      e.target.value = '';
    }
  };

  const getCurrentPageTitle = () => {
    if (pathname === '/admin') return '管理后台';
    const config = adminRoutesConfig.find(
      (item) => item.adminHref === pathname
    );
    return config?.label || '管理后台';
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === href;
    return pathname.startsWith(href);
  };

  const getRoleDisplay = (role: string) => {
    return role === 'super_admin' ? '超级管理员' : '普通用户';
  };

  return (
    <div className="bg-muted/30 flex min-h-screen">
      {/* 侧边导航栏 - PC */}
      <aside className="bg-background fixed top-0 left-0 z-40 hidden h-screen w-64 flex-col border-r lg:flex">
        {/* Logo */}
        <div className="border-b p-4">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded">
              <Shield className="h-4 w-4" />
            </div>
            <span>管理后台</span>
          </Link>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-auto p-4">
          <div className="space-y-1">
            {adminRoutesConfig.map((item) =>
              item.adminHref === '/' ? (
                <Link
                  key={item.adminHref}
                  href={item.adminHref!}
                  className="hover:bg-muted text-foregroun flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.adminHref}
                  href={item.adminHref!}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive(item.adminHref!)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              )
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevalidate}
            disabled={isRevalidating}
          >
            {isRevalidating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isRevalidating ? '刷新中...' : '全量刷新缓存'}
          </Button>
        </nav>

        {/* 用户信息 - 侧边栏底部 */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <OptimizedImage
              src={currentUser.avatar}
              alt={currentUser.username}
              className="h-10 w-10 rounded-full object-cover"
              width={40}
              height={40}
            />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {currentUser.username}
              </p>
              <p className="text-muted-foreground text-xs">
                {getRoleDisplay(currentUser.role)}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-20 flex w-full items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-3">
            {/* 导航菜单 - 移动端 */}
            <Sheet>
              <SheetTrigger asChild>
                <Menu className="h-5 w-5 lg:hidden" aria-label="打开菜单" />
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader>
                  <SheetClose asChild>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="flex size-10"
                    >
                      <Link href="/admin">
                        <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded">
                          <Shield className="h-4 w-4" />
                        </div>
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetTitle>管理后台</SheetTitle>
                </SheetHeader>
                {/* 导航 */}
                <nav className="flex-1 overflow-auto p-4">
                  <div className="space-y-1">
                    {adminRoutesConfig.map((item) =>
                      item.adminHref === '/' ? (
                        <Link
                          key={item.adminHref}
                          href={item.adminHref!}
                          className="hover:bg-muted text-foregroun flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                        >
                          {item.icon && <item.icon className="h-4 w-4" />}
                          {item.label}
                        </Link>
                      ) : (
                        <SheetClose asChild key={item.adminHref}>
                          <Link
                            href={item.adminHref!}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                              isActive(item.adminHref!)
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            {item.icon && <item.icon className="h-4 w-4" />}
                            {item.label}
                          </Link>
                        </SheetClose>
                      )
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRevalidate}
                    disabled={isRevalidating}
                  >
                    {isRevalidating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isRevalidating ? '刷新中...' : '全量刷新缓存'}
                  </Button>
                </nav>

                {/* 用户信息 */}
                <SheetFooter className="border-t p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <OptimizedImage
                      src={currentUser.avatar}
                      alt={currentUser.username}
                      className="h-10 w-10 rounded-full object-cover"
                      width={40}
                      height={40}
                    />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {currentUser.username}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {getRoleDisplay(currentUser.role)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    登出
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <span className="font-semibold">{getCurrentPageTitle()}</span>
          </div>
          <div className="flex items-center gap-3">
            <GuestbookBadge count={guestbookPendingCount} />
            {/* 用户头像下拉菜单 */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="hover:bg-muted flex items-center gap-3 rounded-lg transition-colors"
              >
                <OptimizedImage
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="h-8 w-8 rounded-full object-cover"
                  width={32}
                  height={32}
                />
                <span className="text-sm font-medium">
                  {currentUser.username}
                </span>
              </button>

              {/* 下拉菜单 */}
              {avatarMenuOpen && (
                <>
                  {/* 点击外部关闭 */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAvatarMenuOpen(false)}
                  />
                  <div className="bg-background absolute right-0 z-20 mt-2 w-48 rounded-lg border py-1 shadow-lg">
                    <div className="border-b px-4 py-2">
                      <p className="text-sm font-medium">
                        {currentUser.username}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {getRoleDisplay(currentUser.role)}
                      </p>
                    </div>

                    {/* 修改头像选项 */}
                    <label className="hover:bg-muted flex cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={isUploadingAvatar}
                        className="hidden"
                      />
                      <Upload className="h-4 w-4" />
                      {isUploadingAvatar ? '上传中...' : '修改头像'}
                    </label>

                    {/* 登出选项 */}
                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        handleLogout();
                      }}
                      className="hover:bg-muted flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      登出
                    </button>
                  </div>
                </>
              )}
            </div>
            <AnimatedThemeToggler
              onThemeChange={toggleTheme}
              className="ml-auto"
            />
          </div>
        </header>
        <main className="px-4 py-20 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
