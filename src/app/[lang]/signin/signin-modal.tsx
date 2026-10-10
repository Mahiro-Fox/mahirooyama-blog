'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AuthModal } from '@/components/auth/auth-modal';
import type { PhotoItem } from '@/lib/photos';

interface SignInModalProps {
  redirectTo: string;
  photos: PhotoItem[] | null;
}

/**
 * 独立登录页：落地即打开登录/注册弹窗。
 * 关闭弹窗（未登录成功）→ 返回首页；登录成功 → 跳转 redirectTo。
 */
export function SignInModal({ redirectTo, photos }: SignInModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const succeeded = useRef(false);

  return (
    <AuthModal
      open={open}
      redirectTo={redirectTo}
      photos={photos}
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