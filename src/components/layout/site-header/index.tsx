'use client';

import { LogOut, Menu, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { userLogout } from '@/actions/user-auth';
import { Search } from '@/components/layout/site-header/search';
import { Button } from '@/components/shadcn-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn-ui/dropdown-menu';
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
import { BrandIcons } from '@/components/shared/brand-icons';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { Link } from '@/components/shared/link';
import { SiteLogo } from '@/components/shared/site-logo';
import { ThemeSwitcher } from '@/components/shared/theme-switcher';
import { groupedNavRoutes, siteConfig } from '@/config/common';
import { useT } from '@/i18n/dictionary-provider';

interface SiteHeaderUser {
  id: string;
  username: string;
}

interface SiteHeaderProps {
  initialUserAuth?: SiteHeaderUser | null;
}

export function SiteHeader({ initialUserAuth = null }: SiteHeaderProps) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => pathname === href;
  const [currentUser, setCurrentUser] = useState<SiteHeaderUser | null>(
    initialUserAuth
  );
  const [prevAuth, setPrevAuth] = useState<SiteHeaderUser | null>(
    initialUserAuth
  );
  if (initialUserAuth !== prevAuth) {
    setPrevAuth(initialUserAuth);
    setCurrentUser(initialUserAuth);
  }

  const handleLogout = async () => {
    try {
      await userLogout();
      setCurrentUser(null);
      toast.success('Logged out');
      router.refresh();
    } catch {
      toast.error('Logout failed');
    }
  };

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
                    return (
                      <NavigationMenuItem key={categoryName}>
                        <NavigationMenuTrigger>
                          {t(categoryName)}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                          {items.map(
                            (item) =>
                              // 如果需要认证且用户未认证，则不显示
                              (!item.needAuth || !!currentUser) && (
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
                                      <span>{t(item.navLabel || '')}</span>
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
                      return (
                        <div key={categoryName}>
                          <div className="text-muted-foreground px-4 py-2 text-sm font-semibold">
                            {categoryName}
                          </div>
                          {items.map(
                            (item) =>
                              (!item.needAuth || !!currentUser) && (
                                <SheetClose asChild key={item.navHref}>
                                  <Link
                                    href={item.navHref!}
                                    className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                                      isActive(item.navHref!)
                                        ? 'bg-accent text-accent-foreground'
                                        : 'hover:bg-muted'
                                    }`}
                                  >
                                    {item.icon && (
                                      <item.icon className="h-4 w-4" />
                                    )}
                                    {t(item.navLabel || '')}
                                  </Link>
                                </SheetClose>
                              )
                          )}
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
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Separator orientation="vertical" />
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {currentUser.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44" align="end">
                  <DropdownMenuLabel>
                    {t('user_menu.welcome')}, {currentUser.username}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('user_menu.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="h-8 shadow-none"
              >
                <Link href="/signin">
                  <User className="mr-1 h-4 w-4" />
                  {t('user_menu.signin')}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
