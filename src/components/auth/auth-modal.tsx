'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import {
  registerWithEmail,
  startEmailAuth,
  userLogin,
  verifyEmailCode,
} from '@/actions/app/user-auth';
import { Button } from '@/components/shadcn-ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Input } from '@/components/shadcn-ui/input';
import { Label } from '@/components/shadcn-ui/label';
import { FadeCarousel } from '@/components/shared/fade-carousel';
import { imageSizes } from '@/components/shared/image-sizes';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { siteConfig } from '@/config/common';
import { useT } from '@/i18n/dictionary-provider';
import type { PhotoItem } from '@/lib/photos';

/** 弹窗步骤：邮箱 → （已注册）密码 | （未注册）验证码 → 设置密码 */
type AuthStep = 'email' | 'password' | 'code' | 'setPassword';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 登录/注册成功后的跳转地址；不传则仅刷新当前页数据 */
  redirectTo?: string;
  /** 成功回调（在关闭弹窗之前调用），供父级做额外处理 */
  onSuccess?: () => void;
  /** 左侧写真轮播的竖构图图片；为空时隐藏左侧面板、表单占满整宽 */
  photos?: PhotoItem[] | null;
}

// 后端返回的稳定机器码 → i18n key
const ERROR_KEYS: Record<string, string> = {
  INVALID_EMAIL: 'auth.err_invalid_email',
  RESEND_TOO_SOON: 'auth.err_resend_too_soon',
  RATE_LIMITED: 'auth.err_rate_limited',
  SEND_FAILED: 'auth.err_send_failed',
  CODE_MISMATCH: 'auth.err_code_mismatch',
  CODE_NOT_FOUND: 'auth.err_code_not_found',
  CODE_EXPIRED: 'auth.err_code_expired',
  TOO_MANY_ATTEMPTS: 'auth.err_too_many_attempts',
  INVALID_CODE_FORMAT: 'auth.err_invalid_code',
  USERNAME_TOO_SHORT: 'auth.err_username_short',
  USERNAME_TAKEN: 'auth.err_username_taken',
  PASSWORD_TOO_SHORT: 'auth.err_password_short',
  EMAIL_TAKEN: 'auth.err_email_taken',
  REGISTER_FAILED: 'auth.err_register_failed',
  VERIFY_FAILED: 'auth.err_verify_failed',
};

const RESEND_SECONDS = 60; // 与后端重发节流保持一致

// 主按钮统一渐变样式（樱粉 → 藤紫 → 天青，取自二次元主题变量）
const GRADIENT_BUTTON =
  'w-full border-0 bg-gradient-to-r from-[var(--auth-grad-from)] via-[var(--auth-grad-via)] to-[var(--auth-grad-to)] text-white shadow-md hover:opacity-90';

export function AuthModal({
  open,
  onOpenChange,
  redirectTo,
  onSuccess,
  photos,
}: AuthModalProps) {
  const t = useT();
  const router = useRouter();
  const hasPhotos = !!photos?.length;
  const carouselItems = (photos ?? []).map((photo) => ({
    id: photo.id,
    image: photo.src,
  }));

  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0); // 验证码重发倒计时（秒）
  const [rateLimitIn, setRateLimitIn] = useState(0); // 登录限流倒计时（秒）

  // 关闭后重置，下次打开回到第一步
  useEffect(() => {
    if (open) return;
    setStep('email');
    setEmail('');
    setPassword('');
    setCode('');
    setUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setResendIn(0);
    setRateLimitIn(0);
    setLoading(false);
  }, [open]);

  // 重发倒计时
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => {
      setResendIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  // 登录限流倒计时
  useEffect(() => {
    if (rateLimitIn <= 0) return;
    const timer = setInterval(() => {
      setRateLimitIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitIn]);

  const errorText = (code2: string) =>
    t(ERROR_KEYS[code2] ?? '') || t('auth.err_generic');

  const finish = () => {
    toast.success(t('auth.success'));
    // 先回调再关闭：让调用方能在关闭前标记"已成功"，避免关闭动作触发额外跳转
    onSuccess?.();
    onOpenChange(false);
    if (redirectTo) {
      router.replace(redirectTo);
    } else {
      // 刷新服务端组件，让 header 的登录态、chat 的模式随之更新
      router.refresh();
    }
  };

  // 第一步：提交邮箱
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await startEmailAuth(email);
      if (!res.success) {
        // 已有验证码在有效期内：直接进入验证码步骤，并展示重发倒计时
        if (res.error === 'RESEND_TOO_SOON') {
          setResendIn(res.retryAfter ?? RESEND_SECONDS);
          setStep('code');
          return;
        }
        setError(errorText(res.error));
        return;
      }
      if (res.exists) {
        setStep('password');
      } else {
        setResendIn(RESEND_SECONDS);
        setStep('code');
        toast.success(t('auth.code_sent'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 第二步（已注册）：密码登录
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await userLogin(email, password);
      if (!res.success) {
        if (res.resetTime) {
          setRateLimitIn(Math.ceil((res.resetTime - Date.now()) / 1000));
          setError(t('auth.err_rate_limited'));
        } else {
          setError(t('auth.err_wrong_password'));
        }
        return;
      }
      finish();
    } finally {
      setLoading(false);
    }
  };

  // 第二步（未注册）：校验验证码
  const handleCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyEmailCode(email, code);
      if (!res.success) {
        setError(
          res.remainingAttempts != null
            ? `${errorText(res.error)} · ${t('auth.attempts_left')} ${res.remainingAttempts}`
            : errorText(res.error)
        );
        return;
      }
      setStep('setPassword');
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await startEmailAuth(email);
      if (!res.success) {
        if (res.error === 'RESEND_TOO_SOON') {
          setResendIn(res.retryAfter ?? RESEND_SECONDS);
          return;
        }
        setError(errorText(res.error));
        return;
      }
      setResendIn(RESEND_SECONDS);
      toast.success(t('auth.code_sent'));
    } finally {
      setLoading(false);
    }
  };

  // 第三步（未注册）：设置用户名 + 密码，完成注册
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t('auth.err_password_mismatch'));
      return;
    }
    setLoading(true);
    try {
      const res = await registerWithEmail({
        email,
        code,
        username,
        password: newPassword,
      });
      if (!res.success) {
        setError(errorText(res.error));
        return;
      }
      finish();
    } finally {
      setLoading(false);
    }
  };

  // 各步骤标题/描述
  const titleByStep: Record<AuthStep, string> = {
    email: t('auth.title'),
    password: t('auth.welcome_back'),
    code: t('auth.code_title'),
    setPassword: t('auth.signup_title'),
  };
  const descByStep: Record<AuthStep, string> = {
    email: t('auth.subtitle'),
    password: t('auth.password_desc').replace('{{email}}', email),
    code: t('auth.code_desc').replace('{{email}}', email),
    setPassword: t('auth.signup_desc'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/90 relative flex overflow-hidden rounded-2xl border-0 p-0 shadow-[0_24px_70px_-24px_var(--auth-glow)] sm:max-w-xl">
        <DialogClose onClick={() => onOpenChange(false)} />
        {/* 二次元霓虹辉光 */}
        <div
          className="pointer-events-none absolute -top-20 -right-12 h-44 w-44 rounded-full bg-[var(--auth-grad-from)] opacity-30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-[var(--auth-grad-to)] opacity-30 blur-3xl"
          aria-hidden
        />

        {/* 左侧写真轮播（小屏隐藏，表单自动占满整宽） */}
        {hasPhotos && (
          <div className="inset-y-0 left-0 hidden aspect-[9/16] w-[42%] overflow-hidden sm:block">
            <FadeCarousel
              className="h-full w-full max-w-none rounded-none"
              random
              arrow={false}
              indicator={false}
              autoPlayInterval={8000}
              items={carouselItems}
              itemRender={(item, { index }) => (
                <OptimizedImage
                  key={item.id}
                  src={item.image}
                  alt={siteConfig.name}
                  fill
                  priority={index === 0}
                  sizes={imageSizes.hero}
                />
              )}
            />
            {/* 右侧渐隐，与表单区自然融合 */}
            <div className="via-background/30 to-background/90 pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent" />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-center p-6">
          <DialogHeader className="relative space-y-1">
            <DialogTitle className="text-center text-2xl font-bold">
              {titleByStep[step]}
            </DialogTitle>
            <DialogDescription className="text-center">
              {descByStep[step]}
            </DialogDescription>
            {/* 渐变装饰线 */}
            <div
              className="mx-auto mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[var(--auth-grad-from)] to-[var(--auth-grad-to)]"
              aria-hidden
            />
          </DialogHeader>

          <div className="[&_input]:bg-foreground/5 relative mt-4 [&_input]:h-10 [&_input]:rounded-xl">
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-email">{t('auth.email')}</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoFocus
                    placeholder={t('auth.enter_email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <Button
                  type="submit"
                  className={GRADIENT_BUTTON}
                  disabled={loading || !email}
                >
                  {loading ? t('auth.checking') : t('auth.continue')}
                </Button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-password">{t('auth.password')}</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoFocus
                    placeholder={t('auth.enter_password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className={GRADIENT_BUTTON}
                  disabled={loading || !password || rateLimitIn > 0}
                >
                  {rateLimitIn > 0
                    ? `${t('auth.wait_in').replace('{{seconds}}', String(rateLimitIn))}`
                    : loading
                      ? t('auth.signing_in')
                      : t('auth.signin')}
                </Button>
                <BackButton
                  onClick={() => setStep('email')}
                  label={t('auth.back')}
                />
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-code">{t('auth.code')}</Label>
                  <Input
                    id="auth-code"
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    placeholder={t('auth.enter_code')}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoComplete="one-time-code"
                  />
                </div>
                <Button
                  type="submit"
                  className={GRADIENT_BUTTON}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? t('auth.verifying') : t('auth.verify')}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <BackButton
                    onClick={() => {
                      setError('');
                      setStep('email');
                    }}
                    label={t('auth.back')}
                  />
                  <button
                    type="button"
                    className="text-primary disabled:text-muted-foreground hover:underline disabled:no-underline"
                    disabled={loading || resendIn > 0}
                    onClick={handleResend}
                  >
                    {resendIn > 0
                      ? t('auth.resend_in').replace(
                          '{{seconds}}',
                          String(resendIn)
                        )
                      : t('auth.resend')}
                  </button>
                </div>
              </form>
            )}

            {step === 'setPassword' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-username">{t('auth.username')}</Label>
                  <Input
                    id="auth-username"
                    type="text"
                    autoFocus
                    placeholder={t('auth.enter_username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-new-password">
                    {t('auth.new_password')}
                  </Label>
                  <Input
                    id="auth-new-password"
                    type="password"
                    placeholder={t('auth.enter_new_password')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-confirm-password">
                    {t('auth.confirm_password')}
                  </Label>
                  <Input
                    id="auth-confirm-password"
                    type="password"
                    placeholder={t('auth.enter_confirm_password')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  className={GRADIENT_BUTTON}
                  disabled={loading}
                >
                  {loading ? t('auth.registering') : t('auth.register')}
                </Button>
              </form>
            )}

            {error && (
              <p className="text-destructive mt-3 text-center text-sm">
                {error}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 返回上一步的小按钮（图标 + 文案） */
function BackButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
