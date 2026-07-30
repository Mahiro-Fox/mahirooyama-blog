// src/components/shared/link.tsx
'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { i18nConfig } from '@/i18n/i18n.config';
import { useLocale } from '@/i18n/use-locale';

type LinkProps = ComponentProps<typeof NextLink>;

function localizeHref(href: string, locale: string): string {
  // 只处理站内绝对路径，外链、锚点、mailto 等原样返回
  if (!href.startsWith('/') || href.startsWith('//')) return href;

  // 默认语言不加前缀（因为 middleware 是 rewrite，不需要显式前缀）
  if (locale === i18nConfig.defaultLang) return href;

  // 非默认语言，拼上前缀（避免 /zh/zh 这种重复拼接）
  return `/${locale}${href === '/' ? '' : href}`;
}

interface WithLocaleLinkProps extends LinkProps {
  href: string;
}
/**
 * 自动根据当前语言添加前缀的链接组件
 */
export const Link = ({ href, ...props }: WithLocaleLinkProps) => {
  const locale = useLocale();
  const localizedHref =
    typeof href === 'string' ? localizeHref(href, locale) : href; // href 是 UrlObject 的情况暂不处理，按需扩展

  return <NextLink href={localizedHref} {...props} />;
};

Link.displayName = 'Link';
