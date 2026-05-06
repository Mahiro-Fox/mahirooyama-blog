'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login, verifyAuth } from '@/actions/admin/auth';
import { toast } from 'sonner';

import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';
import { Input } from '@/components/shadcn-ui/input';
import { Label } from '@/components/shadcn-ui/label';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState<number | null>(null);

  // 速率限制倒计时
  useEffect(() => {
    if (!rateLimitTime || rateLimitTime <= 0) return;

    const timer = setInterval(() => {
      setRateLimitTime((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitTime]);

  // 检查是否已经登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await verifyAuth();
        if (result.success) {
          // 已登录，跳转到管理后台
          const redirect = searchParams.get('redirect') || '/admin';
          router.replace(redirect);
        }
      } catch {
        // 未登录，留在登录页
      }
    };

    checkAuth();
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setRateLimitTime(null);

    try {
      const result = await login(username, password);

      if (!result.success) {
        toast.error(result.error || '登录失败');
      } else {
        toast.success('登录成功');
        // 登录成功，跳转到原目标页面或管理后台
        const redirect = searchParams.get('redirect') || '/admin';
        router.push(redirect);
      }
    } catch (error) {
      toast.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            管理后台
          </CardTitle>
          <CardDescription className="text-center">
            请输入用户名和密码登录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUsername(e.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !!rateLimitTime}
            >
              {rateLimitTime
                ? `请等待 ${Math.ceil(rateLimitTime / 60)} 分 ${rateLimitTime % 60} 秒`
                : loading
                  ? '登录中...'
                  : '登录'}
            </Button>
            {rateLimitTime && (
              <p className="text-muted-foreground text-center text-sm">
                尝试次数过多，请稍后再试
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-muted/50 flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-center text-2xl font-bold">
                管理后台
              </CardTitle>
              <CardDescription className="text-center">
                加载中...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
