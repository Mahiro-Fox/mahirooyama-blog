// src/i18n/use-localized-router.ts
'use client';

import { useRouter } from 'next/navigation';
import { i18nConfig } from '@/i18n/i18n.config';

import { useLocale } from './use-locale';

/** 自定义路由，根据当前语言添加路由前缀
 * @example
 * ```ts
 * const router = useLocalizedRouter();
 * router.push('/dashboard'); // 中文环境下会自动变成 /cn/dashboard
 * ```
 */
export function useLocalizedRouter() {
  const router = useRouter();
  const locale = useLocale();

  const localize = (href: string) => {
    if (!href.startsWith('/') || href.startsWith('//')) return href;
    if (locale === i18nConfig.defaultLang) return href;
    return `/${locale}${href === '/' ? '' : href}`;
  };

  return {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) =>
      router.push(localize(href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
      router.replace(localize(href), options),
  };
}
