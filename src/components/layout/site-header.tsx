'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { pageRoutesConfig, siteConfig } from '@/lib/config';
import { Button } from '@/components/shadcn-ui/button';
import { Separator } from '@/components/shadcn-ui/separator';
import { ModeSwitcher } from '@/components/layout/mode-switcher';
import { BrandIcons } from '@/components/shared/brand-icons';
import { SiteLogo } from '@/components/shared/site-logo';

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  return (
    <header className="bg-background sticky top-0 z-50 w-full">
      <div className="container-wrapper px-6">
        <div className="container flex h-12 items-center gap-2 border-b **:data-[slot=separator]:!h-4 md:h-16">
          <Button asChild variant="ghost" size="icon" className="flex size-10">
            <Link href="/">
              <SiteLogo className="size-8 rounded-full" />
              <span className="sr-only">{siteConfig.name}</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {pageRoutesConfig.map((item) => (
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
            <ModeSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
