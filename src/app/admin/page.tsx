'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { pageRoutesConfig } from '@/lib/config';
import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';

export default function AdminPage() {
  const router = useRouter();

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
  const [isRevalidating, setIsRevalidating] = useState(false);

  // 手动刷新缓存
  const handleRevalidate = async () => {
    setIsRevalidating(true);
    try {
      const response = await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'all' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '刷新失败');
      }

      const data = await response.json();
      toast.success('页面缓存已刷新，1小时内生效');
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

      {/* 主内容 */}
      <main className="mx-auto max-w-6xl p-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Blog 管理卡片 */}
          {pageRoutesConfig.map((config) => (
            <Link key={config.name} href={config.adminHref}>
              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-lg">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>{config.label}</CardTitle>
                      <CardDescription>{config.title}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {config.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
