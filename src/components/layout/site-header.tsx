'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useTheme } from 'next-themes';

import { navRoutesConfig, siteConfig } from '@/config/config';
import { AnimatedThemeToggler } from '@/components/shadcn-ui/animated-theme-toggler';
import { Button } from '@/components/shadcn-ui/button';
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
  const [isOpen, setIsOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  return (
    <header className="bg-background sticky top-0 z-50 w-full">
      <div className="container-wrapper px-6">
        <div className="container flex h-12 items-center justify-between gap-2 border-b **:data-[slot=separator]:!h-4 md:h-16">
          <Button asChild variant="ghost" size="icon" className="flex size-10">
            <Link href="/">
              <SiteLogo className="overflow-hidden rounded-full" />
              <span className="sr-only">{siteConfig.name}</span>
            </Link>
          </Button>
          {/* 桌面端导航 - 在中等屏幕以上显示 */}
          <nav className="hidden items-center gap-2 md:flex">
            {navRoutesConfig.map((item) => (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8"
                key={item.navHref}
              >
                <Link
                  href={item.navHref}
                  className={
                    isActive(item.navHref)
                      ? 'bg-accent'
                      : 'hover:bg-transparent'
                  }
                >
                  {item.name}
                </Link>
              </Button>
            ))}
          </nav>
          {/* 移动端侧边栏导航 */}
          <Sheet>
            <SheetTrigger asChild>
              <Menu className="md:hidden" />
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Edit profile</SheetTitle>
                <SheetDescription>
                  Make changes to your profile here. Click save when you&apos;re
                  done.
                </SheetDescription>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2">
                {navRoutesConfig.map((item) => (
                  <SheetClose asChild key={item.navHref}>
                    <Link
                      href={item.navHref}
                      className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                        isActive(item.navHref)
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Search />
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
