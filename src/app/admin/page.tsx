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
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshCache = async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      // 先获取所有 blog 和 gallery 的 slug
      const [blogRes, galleryRes] = await Promise.all([
        fetch('/api/mdx-files').catch(() => null),
        fetch('/api/gallery-files').catch(() => null),
      ]);

      const blogFiles = blogRes?.ok ? await blogRes.json() : [];
      const galleryFiles = galleryRes?.ok ? await galleryRes.json() : [];

      // 构建所有需要刷新的路径
      const pathsToRevalidate = [
        { type: 'path', path: '/' },
        { type: 'path', path: '/blog' },
        { type: 'path', path: '/gallery' },
        // 刷新所有博客详情页
        ...blogFiles.map((file: { slug: string }) => ({
          type: 'path',
          path: `/blog/${file.slug}`,
        })),
        // 刷新所有画廊详情页
        ...galleryFiles.map((file: { slug: string }) => ({
          type: 'path',
          path: `/gallery/${file.slug}`,
        })),
      ];

      // 并行刷新所有路径
      const results = await Promise.all(
        pathsToRevalidate.map(async (item) => {
          try {
            const res = await fetch('/api/revalidate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
            return { path: item.path, success: res.ok };
          } catch {
            return { path: item.path, success: false };
          }
        })
      );

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        toast.success(`成功刷新 ${successCount} 个页面缓存`);
      } else {
        toast.warning(`刷新完成: ${successCount} 成功, ${failCount} 失败`);
      }

      console.log('缓存刷新结果:', results);
    } catch (error) {
      toast.error('刷新缓存时发生错误');
      console.error('刷新缓存失败:', error);
    } finally {
      setRefreshing(false);
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
              onClick={handleRefreshCache}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {refreshing ? '刷新中...' : '刷新缓存'}
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
