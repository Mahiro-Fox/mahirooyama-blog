// src/i18n/use-locale.ts
'use client';

import { usePathname } from 'next/navigation';
import { i18nConfig } from '@/i18n/i18n.config';

const locales = i18nConfig.locales;
const defaultLang = i18nConfig.defaultLang;

export function useLocale(): string {
  const pathname = usePathname();
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const currentLang = locales.includes(firstSegment)
    ? firstSegment
    : defaultLang;
  return currentLang;
}

export { locales, defaultLang };
