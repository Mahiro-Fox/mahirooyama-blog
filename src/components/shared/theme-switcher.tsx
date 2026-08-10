'use client';

import { Palette } from 'lucide-react';
import { Button } from '@/components/shadcn-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn-ui/dropdown-menu';
import { useT } from '@/i18n/dictionary-provider';
import { useTheme } from '@/hooks/use-theme';
import { Check } from 'lucide-react';

/**
 * 主题切换器
 *
 * 在 site-header 原主题切换按钮位置使用。
 * 下拉菜单展示 5 套配色方案，每项带主色/背景色双圆点预览。
 * 选中项右侧显示对勾，当前主题高亮。
 */
export function ThemeSwitcher() {
  const t = useT();
  const { currentTheme, setTheme, themes, mounted } = useTheme();

  // 未 mount 时不渲染触发器的主题色块（避免 SSR/CSR 不匹配警告）
  // 但触发器本身仍渲染，保持布局稳定
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 shadow-none"
          aria-label={t('theme.switcher_label')}
        >
          <Palette className="h-4 w-4" />
          {/* 当前主题色块预览 - mount 后才显示真实色，避免 SSR 不匹配 */}
          {mounted && (
            <span
              className="h-3.5 w-3.5 rounded-full border border-border"
              style={{
                backgroundColor: `var(--primary)`,
              }}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('theme.switcher_label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((theme) => {
          const isActive = mounted && currentTheme === theme.id;
          return (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className="cursor-pointer justify-between"
            >
              <span className="flex items-center gap-2.5">
                {/* 双圆点预览：背景色 + 主色，直观展示配色 */}
                <span className="flex items-center gap-1">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: theme.bgSwatch }}
                  />
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ backgroundColor: theme.swatch }}
                  />
                </span>
                <span className={isActive ? 'text-[var(--primary)] font-medium' : ''}>
                  {t(theme.labelKey)}
                </span>
              </span>
              {isActive && <Check className="h-4 w-4 text-[var(--primary)]" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
