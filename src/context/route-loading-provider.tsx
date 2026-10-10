'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { cn } from '@/utils/utils';

/**
 * 全局路由导航加载指示。
 * 通过收集各个 <Link> 上报的 pending 状态，判断是否有客户端导航正在加载，
 * 并在顶部渲染一条细进度条提示用户。
 *
 * pending 采用"id 集合"计数：多个链路同时导航时，只要还有任一 pending 就保持显示，
 * 全部结束后才隐藏。避免快速连续点击时的闪烁。
 */
interface RouteLoadingContextValue {
  begin: (id: string) => void;
  end: (id: string) => void;
}

const RouteLoadingContext = createContext<RouteLoadingContextValue | null>(
  null
);

export function useRouteLoading() {
  const context = useContext(RouteLoadingContext);
  if (!context) {
    throw new Error('useRouteLoading must be used within RouteLoadingProvider');
  }
  return context;
}

interface RouteLoadingProviderProps {
  children: React.ReactNode;
}

// 顶部细进度条动画：左→右往复滑动（indeterminate），无需真实进度百分比
const BAR_KEYFRAMES = `
@keyframes route-progress-slide {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
`;

function RouteLoadingBar({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{ transition: 'opacity 0.25s ease-out' }}
    >
      <div
        className="bg-foreground absolute top-0 left-0 h-full w-1/4 rounded-r-full"
        style={{
          animation: visible
            ? 'route-progress-slide 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) infinite'
            : 'none',
        }}
      />
      <style>{BAR_KEYFRAMES}</style>
    </div>
  );
}

export function RouteLoadingProvider({ children }: RouteLoadingProviderProps) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  const begin = useCallback((id: string) => {
    setPendingIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const end = useCallback((id: string) => {
    setPendingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo<RouteLoadingContextValue>(
    () => ({ begin, end }),
    [begin, end]
  );

  const visible = pendingIds.size > 0;

  return (
    <RouteLoadingContext.Provider value={value}>
      {children}
      <RouteLoadingBar visible={visible} />
    </RouteLoadingContext.Provider>
  );
}
