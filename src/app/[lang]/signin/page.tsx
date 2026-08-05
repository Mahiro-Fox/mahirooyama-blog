'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Suspense, useEffect, useState } from 'react';
import { checkUserLogin, userLogin } from '@/actions/user-auth';
import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';
import { Input } from '@/components/shadcn-ui/input';
import { Label } from '@/components/shadcn-ui/label';
import { useT } from '@/i18n/dictionary-provider';
import { Link } from '@/components/shared/link';

function SignInForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState<number | null>(null);

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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await checkUserLogin();
        if (result.success) {
          const redirect = searchParams.get('redirect') || '/chat';
          router.replace(redirect);
        }
      } catch {
        // Not logged in, stay
      }
    };

    checkAuth();
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setRateLimitTime(null);

    try {
      const result = await userLogin(username, password);

      if (!result.success) {
        toast.error(result.error || t('signin.login_failed'));
        if (result.resetTime) {
          setRateLimitTime(Math.ceil((result.resetTime - Date.now()) / 1000));
        }
      } else {
        toast.success(t('signin.login_success'));
        const redirect = searchParams.get('redirect') || '/chat';
        router.push(redirect);
      }
    } catch {
      toast.error(t('signin.login_failed_retry'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            {t('signin.page_title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('signin.page_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('signin.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('signin.enter_username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('signin.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('signin.enter_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !!rateLimitTime}
            >
              {rateLimitTime
                ? `${t('signin.wait')} ${Math.ceil(rateLimitTime / 60)}m ${rateLimitTime % 60}s`
                : loading
                  ? t('signin.signing_in')
                  : t('signin.submit')}
            </Button>
            {rateLimitTime && (
              <p className="text-muted-foreground text-center text-sm">
                {t('signin.rate_limit_warning')}
              </p>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-muted-foreground text-sm">
            {t('signin.no_account')}{' '}
            <Link
              href={`/signup${searchParams.get('redirect') ? `?redirect=${searchParams.get('redirect')}` : ''}`}
              className="text-primary hover:underline"
            >
              {t('signin.create_account')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function SignInFallback() {
  const t = useT();
  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            {t('signin.page_title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('signin.loading')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  );
}
