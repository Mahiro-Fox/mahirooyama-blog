'use client';

import { Check, Palette } from 'lucide-react';
import { Button } from '@/components/shadcn-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn-ui/dropdown-menu';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/dictionary-provider';

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
              className="border-border h-3.5 w-3.5 rounded-full border"
              style={{
                backgroundColor: `var(--primary)`,
              }}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuLabel>{t('theme.switcher_label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[200px]">
          <DropdownMenuLabel>
            {t('theme.switcher_label_light')}
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            {themes
              .filter((theme) => theme.type === 'light')
              .map((theme) => {
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
                          className="border-border h-3.5 w-3.5 rounded-full border"
                          style={{ backgroundColor: theme.bgSwatch }}
                        />
                        <span
                          className="border-border h-3.5 w-3.5 rounded-full border"
                          style={{ backgroundColor: theme.swatch }}
                        />
                      </span>
                      <span
                        className={
                          isActive ? 'font-medium text-[var(--primary)]' : ''
                        }
                      >
                        {t(theme.labelKey)}
                      </span>
                    </span>
                    {isActive && (
                      <Check className="h-4 w-4 text-[var(--primary)]" />
                    )}
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>
            {t('theme.switcher_label_dark')}
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            {themes
              .filter((theme) => theme.type === 'dark')
              .map((theme) => {
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
                          className="border-border h-3.5 w-3.5 rounded-full border"
                          style={{ backgroundColor: theme.bgSwatch }}
                        />
                        <span
                          className="border-border h-3.5 w-3.5 rounded-full border"
                          style={{ backgroundColor: theme.swatch }}
                        />
                      </span>
                      <span
                        className={
                          isActive ? 'font-medium text-[var(--primary)]' : ''
                        }
                      >
                        {t(theme.labelKey)}
                      </span>
                    </span>
                    {isActive && (
                      <Check className="h-4 w-4 text-[var(--primary)]" />
                    )}
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
