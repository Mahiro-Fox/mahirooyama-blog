import { RefObject, useEffect } from 'react';

/**
 * 点击外部元素时触发
 * @param ref 元素引用
 * @param handler 事件处理函数
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    function listener(event: MouseEvent | TouchEvent) {
      const element = ref.current;

      if (!element) return;

      // 点击的是元素内部，不处理
      if (element.contains(event.target as Node)) return;

      handler(event);
    }

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
