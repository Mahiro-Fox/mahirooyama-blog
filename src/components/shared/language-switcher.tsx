'use client';

import { Languages } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { setLocale } from '@/actions/set-locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn-ui/dropdown-menu';
import { i18nConfig } from '@/i18n/i18n.config';
import { useLocale } from '@/i18n/use-locale';

export function LanguageSwitcher() {
  const pathname = usePathname();
  const currentLocale = useLocale();
  const [isPending, setIsPending] = useState(false);

  function switchLocaleHref(pathname: string, targetLocale: string): string {
    const segments = pathname.split('/').filter(Boolean);
    if (i18nConfig.locales.includes(segments[0])) segments.shift(); // 去掉当前语言前缀（如果有）

    const rest = segments.length ? `/${segments.join('/')}` : '';
    return targetLocale === i18nConfig.defaultLang
      ? rest || '/'
      : `/${targetLocale}${rest}`;
  }

  const handleSwitch = async (targetLocale: string) => {
    setIsPending(true);
    try {
      // 1. 先调用 Server Action 设置 Cookie 并等待返回
      await setLocale(targetLocale);

      // 2. 计算目标路径
      const targetHref = switchLocaleHref(pathname, targetLocale);

      // 3. 页面刷新/跳转 (Next.js 中使用 router.refresh() 配合 push 或直接 location 刷新)
      window.location.href = targetHref;
    } finally {
      setIsPending(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Languages className="h-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-20" align="start">
        <DropdownMenuGroup>
          {i18nConfig.languageOptions.map((item) => (
            <DropdownMenuItem
              disabled={isPending || item.value === currentLocale}
              className="cursor-pointer"
              key={item.value}
              onClick={() => handleSwitch(item.value)}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
