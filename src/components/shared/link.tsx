// src/components/shared/link.tsx
'use client';

import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import NextLink from 'next/link';
import { defaultLang, useLocale } from '@/i18n/use-locale';

type LinkProps = ComponentProps<typeof NextLink>;

function localizeHref(href: string, locale: string): string {
  // 只处理站内绝对路径，外链、锚点、mailto 等原样返回
  if (!href.startsWith('/') || href.startsWith('//')) return href;

  // 默认语言不加前缀（因为 middleware 是 rewrite，不需要显式前缀）
  if (locale === defaultLang) return href;

  // 非默认语言，拼上前缀（避免 /zh/zh 这种重复拼接）
  return `/${locale}${href === '/' ? '' : href}`;
}
/**
 * 自动根据当前语言添加前缀的链接组件
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, ...props }, ref) => {
    const locale = useLocale();
    const localizedHref =
      typeof href === 'string' ? localizeHref(href, locale) : href; // href 是 UrlObject 的情况暂不处理，按需扩展

    return <NextLink ref={ref} href={localizedHref} {...props} />;
  }
);

Link.displayName = 'Link';
