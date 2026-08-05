'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Suspense, useState } from 'react';
import { userRegister } from '@/actions/user-auth';
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

function SignUpForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (username.length < 3) {
      toast.error(t('signup.username_short'));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error(t('signup.password_short'));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('signup.password_mismatch'));
      setLoading(false);
      return;
    }

    try {
      const result = await userRegister(username, password);

      if (!result.success) {
        toast.error(result.error || t('signup.failed'));
      } else {
        toast.success(t('signup.success'));
        const redirect = searchParams.get('redirect') || '/chat';
        router.push(redirect);
      }
    } catch {
      toast.error(t('signup.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            {t('signup.page_title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('signup.page_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('signup.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('signup.enter_username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('signup.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('signup.enter_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t('signup.confirm_password')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('signup.confirm_password_placeholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('signup.registering') : t('signup.submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-muted-foreground text-sm">
            {t('signup.has_account')}{' '}
            <Link
              href={`/signin${searchParams.get('redirect') ? `?redirect=${searchParams.get('redirect')}` : ''}`}
              className="text-primary hover:underline"
            >
              {t('signup.go_signin')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function SignUpFallback() {
  const t = useT();
  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            {t('signup.page_title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('signup.loading')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpForm />
    </Suspense>
  );
}
