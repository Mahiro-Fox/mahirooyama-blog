'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/dictionary-provider';
import { Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

import { groupedNavRoutes, siteConfig } from '@/config/common';
import { Button } from '@/components/shadcn-ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/shadcn-ui/navigation-menu';
import { Separator } from '@/components/shadcn-ui/separator';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/shadcn-ui/sheet';
import { Search } from '@/components/content/search';
import { AnimatedThemeToggler } from '@/components/shared/animated-theme-toggler';
import { BrandIcons } from '@/components/shared/brand-icons';
import { Link } from '@/components/shared/link';
import { SiteLogo } from '@/components/shared/site-logo';

interface SiteHeaderProps {
  initialIsAuth?: boolean;
}

export function SiteHeader({ initialIsAuth = false }: SiteHeaderProps) {
  const t = useT();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  const { setTheme, resolvedTheme } = useTheme();
  const [isAdminAuth, setIsAdminAuth] = useState(initialIsAuth);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    if (!initialIsAuth) {
      setIsAdminAuth(false);
    }
  }, [initialIsAuth]);

  return (
    <header className="bg-background sticky top-0 z-50 w-full">
      <div className="container-wrapper px-6">
        <div className="container flex h-12 items-center justify-between gap-2 border-b **:data-[slot=separator]:!h-4 md:h-16">
          <div className="flex items-center gap-2 md:flex-1 md:justify-end">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hidden size-10 md:flex"
            >
              <Link href="/">
                <SiteLogo className="overflow-hidden rounded-full" />
                <span className="sr-only">{t('site_name')}</span>
              </Link>
            </Button>
            {/* 桌面端导航 - 在中等屏幕以上显示 */}
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                {Object.entries(groupedNavRoutes).map(
                  ([categoryName, items]) => {
                    if (categoryName === 'admin' && !isAdminAuth) {
                      return null;
                    }
                    return (
                      <NavigationMenuItem key={categoryName}>
                        <NavigationMenuTrigger>
                          {t(categoryName)}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                          {items.map(
                            (item) =>
                              // 如果需要认证且用户未认证，则不显示
                              (!item.needAuth || isAdminAuth) && (
                                <NavigationMenuLink key={item.navHref} asChild>
                                  <Link
                                    href={item.navHref!}
                                    className={
                                      isActive(item.navHref!)
                                        ? 'bg-accent'
                                        : 'hover:bg-transparent'
                                    }
                                  >
                                    <p className="flex items-center gap-2">
                                      {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                      )}
                                      <span>{t(item.label)}</span>
                                    </p>
                                    <p
                                      className="text-muted-foreground text-xs"
                                      key={item.name}
                                      title={item.name}
                                    >
                                      {t(item.navDescription || '')}
                                    </p>
                                  </Link>
                                </NavigationMenuLink>
                              )
                          )}
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    );
                  }
                )}
              </NavigationMenuList>
            </NavigationMenu>
            {/* 移动端侧边栏导航 */}
            <Sheet>
              <SheetTrigger asChild>
                <Menu className="md:hidden" />
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetClose asChild>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="flex size-10"
                    >
                      <Link href="/">
                        <SiteLogo className="overflow-hidden rounded-full" />
                        <span className="sr-only">{t('site_name')}</span>
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetTitle>{t('site_name')}</SheetTitle>
                  <SheetDescription>{t('site_description')}</SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-2 overflow-auto">
                  {Object.entries(groupedNavRoutes).map(
                    ([categoryName, items]) => {
                      if (categoryName === 'Admin' && !isAdminAuth) {
                        return null;
                      }
                      return (
                        <div key={categoryName}>
                          <div className="text-muted-foreground px-4 py-2 text-sm font-semibold">
                            {categoryName}
                          </div>
                          {items.map((item) => (
                            <SheetClose asChild key={item.navHref}>
                              <Link
                                href={item.navHref!}
                                className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                                  isActive(item.navHref!)
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-muted'
                                }`}
                              >
                                {item.icon && <item.icon className="h-4 w-4" />}
                                {item.name}
                              </Link>
                            </SheetClose>
                          ))}
                        </div>
                      );
                    }
                  )}
                </nav>
              </SheetContent>
            </Sheet>
            <Separator className="md:hidden" orientation="vertical" />
            <Search />
          </div>

          <div className="flex items-center gap-2 md:flex-1 md:justify-end">
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 shadow-none"
            >
              <Link
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
              >
                <BrandIcons.gitHub />
                <span className="sr-only">{t('github_repository')}</span>
              </Link>
            </Button>
            <Separator orientation="vertical" />
            <AnimatedThemeToggler onThemeChange={toggleTheme} />
          </div>
        </div>
      </div>
    </header>
  );
}
