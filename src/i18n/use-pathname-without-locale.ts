// src/i18n/use-locale.ts
'use client';

import { usePathname } from 'next/navigation';
import { i18nConfig } from '@/i18n/i18n.config';

// 获取没有语言的路径名
export function usePathnameWithoutLocale(): string {
  const pathname = usePathname();
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (i18nConfig.locales.includes(firstSegment)) {
    return pathname.replace(`/${firstSegment}`, '');
  }
  return pathname;
}
