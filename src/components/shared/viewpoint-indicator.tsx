'use client';

import { MOBILE_BREAKPOINT } from '@/config';
import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * 视口指示器组件，用于显示当前视口类型（桌面或移动）
 */
export function ViewpointIndicator() {
  const isDesktop = useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT}px)`);

  return (
    <div
      style={{
        width: '300px',
        height: '250px',
        backgroundColor: '#e0e0e0',
        border: '1px solid #ccc',
        textAlign: 'center',
        margin: 'auto',
        lineHeight: '250px',
        fontSize: '16px',
        color: '#333',
      }}
    >
      {isDesktop
        ? `Desktop View (min-width: ${MOBILE_BREAKPOINT}px)`
        : `Mobile View (max-width: ${MOBILE_BREAKPOINT - 1}px)`}
    </div>
  );
}
