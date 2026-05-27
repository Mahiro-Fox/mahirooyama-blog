'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent, trackPageView } from '@/utils/tracker';

/**
 * 全局页面访问埋点组件
 * 放置在 layout 中，监听路由变化并触发 PV 埋点
 */
function PageTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackPageView();
  }, [pathname, searchParams]);

  return null;
}

export function PageTracker() {
  return (
    <Suspense fallback={null}>
      <PageTrackerInner />
    </Suspense>
  );
}

/**
 * 服务端组件专用的事件埋点“像素”组件
 * 用于在 Server Component 渲染时，在客户端触发一次特定事件
 */
export function EventTracker({
  eventName,
  properties = {},
}: {
  eventName: string;
  properties?: Record<string, any>;
}) {
  useEffect(() => {
    trackEvent(eventName, properties);
  }, [eventName, properties]);

  return null;
}
