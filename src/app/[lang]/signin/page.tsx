'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { AuthModal } from '@/components/auth/auth-modal';

/**
 * 独立登录页：落地即打开登录/注册弹窗。
 * 关闭弹窗（未登录成功）→ 返回首页；登录成功 → 跳转 redirect 参数目标。
 */
function SignInModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [open, setOpen] = useState(true);
  const succeeded = useRef(false);

  return (
    <AuthModal
      open={open}
      redirectTo={redirect}
      onSuccess={() => {
        succeeded.current = true;
      }}
      onOpenChange={(next) => {
        setOpen(next);
        // 用户主动关闭且未登录成功：回首页
        if (!next && !succeeded.current) {
          router.replace('/');
        }
      }}
    />
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInModal />
    </Suspense>
  );
}