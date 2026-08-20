'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Suspense, useEffect, useState } from 'react';
import {
  checkUserLogin,
  userLogin,
  // userLoginWithGoogle,
} from '@/actions/app/user-auth';
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
import { Link } from '@/components/shared/link';
import { useT } from '@/i18n/dictionary-provider';

function SignInForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState<number | null>(null);
  // const [isGooglePending, startGoogleTransition] = useTransition();

  useEffect(() => {
    if (!rateLimitTime || rateLimitTime <= 0) return;

    const timer = setInterval(() => {
      setRateLimitTime((prev) => {
        if (prev === null || prev <= 1) {
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

  // const handleGoogleLogin = () => {
  //   const redirect = searchParams.get('redirect') || '/chat';
  //   startGoogleTransition(async () => {
  //     try {
  //       await userLoginWithGoogle(redirect);
  //     } catch {
  //       // NEXT_REDIRECT 会被 Next.js 内部处理，不会到这里
  //       toast.error(t('signin.login_failed_retry'));
  //     }
  //   });
  // };

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

          {/* 分隔线 + Google 登录 */}
          {/* <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">
                {t('signin.or')}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isGooglePending || loading || !!rateLimitTime}
          >
            {isGooglePending ? (
              t('signin.signing_in')
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('signin.google')}
              </>
            )}
          </Button> */}
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
