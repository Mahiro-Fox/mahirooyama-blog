'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { pageRoutesConfig } from '@/lib/config';
import { Button } from '@/components/shadcn-ui/button';
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
    <div className="grid gap-6 md:grid-cols-2">
      {pageRoutesConfig.map((config) => (
        <AdminNavCard
          key={config.name}
          href={config.adminHref}
          icon={config.icon}
          label={config.label}
          title={config.title}
          description={config.description}
        />
      ))}
    </div>
  );
}
