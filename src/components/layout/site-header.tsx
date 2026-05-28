'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

import { groupedNavRoutes, siteConfig } from '@/config/config';
import { verifyAuth } from '@/lib/admin-auth';
import { AnimatedThemeToggler } from '@/components/shadcn-ui/animated-theme-toggler';
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
import { BrandIcons } from '@/components/shared/brand-icons';
import { SiteLogo } from '@/components/shared/site-logo';

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  const { setTheme, resolvedTheme } = useTheme();
  const [isAdminAuth, setIsAdminAuth] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);
  const auth = async () => {
    const authCheck = await verifyAuth();
    if (!authCheck.success) {
      setIsAdminAuth(false);
    } else {
      setIsAdminAuth(true);
    }
  };
  useEffect(() => {
    auth();
  }, []);

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
                <span className="sr-only">{siteConfig.name}</span>
              </Link>
            </Button>
            {/* 桌面端导航 - 在中等屏幕以上显示 */}
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                {Object.entries(groupedNavRoutes).map(
                  ([categoryName, items]) => {
                    if (categoryName === 'Admin' && !isAdminAuth) {
                      return null;
                    }
                    return (
                      <NavigationMenuItem key={categoryName}>
                        <NavigationMenuTrigger>
                          {categoryName}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                          {items.map((item) => (
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
                                  <span>{item.name}</span>
                                </p>
                                <p
                                  className="text-muted-foreground text-xs"
                                  key={item.name}
                                  title={item.name}
                                >
                                  {item.navDescription}
                                </p>
                              </Link>
                            </NavigationMenuLink>
                          ))}
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
                        <span className="sr-only">{siteConfig.name}</span>
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetTitle>{siteConfig.name}</SheetTitle>
                  <SheetDescription>{siteConfig.description}</SheetDescription>
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
                <span className="sr-only">GitHub Repository</span>
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
