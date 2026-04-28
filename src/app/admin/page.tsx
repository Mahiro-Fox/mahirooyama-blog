'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { pageRoutesConfig } from '@/lib/config';
import { Button } from '@/components/shadcn-ui/button';
import { getAdminIcon } from '@/components/admin/admin-icon-map';
import { AdminNavCard } from '@/components/admin/admin-nav-card';

export default function AdminPage() {
  const router = useRouter();
  const [isRevalidating, setIsRevalidating] = useState(false);

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

  // 手动刷新缓存
  const handleRevalidate = async () => {
    setIsRevalidating(true);
    try {
      const response = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '刷新失败');
      }

      const data = await response.json();
      toast.success('所有页面缓存已刷新√');
      console.log('刷新结果:', data.results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刷新缓存失败');
    } finally {
      setIsRevalidating(false);
    }
  };

  return (
    <div className="bg-muted/30 min-h-screen">
      {/* 头部 */}
      <header className="bg-background border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold">管理后台</h1>
          <div className="flex items-center gap-2">
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
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              登出
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容 - 从配置自动生成导航 */}
      <main className="mx-auto max-w-6xl p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {pageRoutesConfig.map((config) => (
            <AdminNavCard
              key={config.name}
              href={config.adminHref}
              icon={getAdminIcon(config.icon)}
              label={config.label}
              title={config.title}
              description={config.description}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
