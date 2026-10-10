'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { AuthModal } from './auth-modal';
import type { PhotoItem } from '@/lib/photos';

interface AuthModalOpenOptions {
  /** 登录/注册成功后的跳转地址；不传则仅刷新当前页数据 */
  redirectTo?: string;
  /** 成功回调（在关闭弹窗之前调用） */
  onSuccess?: () => void;
}

interface AuthModalContextValue {
  openAuthModal: (options?: AuthModalOpenOptions) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

/**
 * 全局登录/注册弹窗 Provider（挂载于 (app) 布局）。
 * 让 header、chat 等页面就地打开弹窗，而不是跳转到独立路由。
 */
export function AuthModalProvider({
  children,
  photos,
}: {
  children?: React.ReactNode;
  /** 左侧写真轮播的竖构图图片，透传给弹窗 */
  photos?: PhotoItem[] | null;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AuthModalOpenOptions>({});

  const openAuthModal = useCallback((opts: AuthModalOpenOptions = {}) => {
    setOptions(opts);
    setOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openAuthModal, closeAuthModal }),
    [openAuthModal, closeAuthModal]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={open}
        onOpenChange={setOpen}
        redirectTo={options.redirectTo}
        onSuccess={options.onSuccess}
        photos={photos}
      />
    </AuthModalContext.Provider>
  );
}

/**
 * 在 (app) 布局内获取弹窗控制句柄。
 * 返回 null 表示当前不在 Provider 内（如 (bare) 布局），调用方需自行兜底。
 */
export function useAuthModal(): AuthModalContextValue | null {
  return useContext(AuthModalContext);
}