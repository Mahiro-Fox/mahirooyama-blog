'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  THEME_STORAGE_KEY,
  defaultTheme,
  themes,
  type ThemeId,
} from '@/config/themes';

/**
 * 主题状态管理 Hook
 *
 * 职责：
 * 1. 读取当前主题（与 <html data-theme> 保持同步）
 * 2. 切换主题：更新 <html data-theme> + 持久化到 localStorage
 *
 * 防闪烁（FOUC）由 layout.tsx 的内联脚本在 HTML 解析阶段处理，
 * 此 hook 仅负责 React 渲染后的状态同步与切换交互。
 */
export function useTheme() {
  // 初始值用 defaultTheme，避免 SSR/CSR 不匹配警告；
  // 真实值在 mount 后的 useEffect 中从 <html> 读取。
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // mount 后从 <html data-theme> 读取真实值（由 layout.tsx 内联脚本设置）
  useEffect(() => {
    const attr = document.documentElement.getAttribute(
      'data-theme'
    ) as ThemeId | null;
    if (attr && themes.some((t) => t.id === attr)) {
      setCurrentTheme(attr);
    }
    setMounted(true);
  }, []);

  /**
   * 切换主题
   * 同步更新 <html data-theme> + localStorage + React state
   */
  const setTheme = useCallback((themeId: ThemeId) => {
    try {
      document.documentElement.setAttribute('data-theme', themeId);
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // localStorage 不可用（隐私模式等）时，仅更新 DOM 属性，切换仍生效
    }
    setCurrentTheme(themeId);
  }, []);

  return {
    currentTheme,
    setTheme,
    themes,
    mounted,
  };
}
