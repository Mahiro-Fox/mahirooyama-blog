import { cn } from '@/utils/utils';
import { MailIcon, RssIcon } from 'lucide-react';

import { siteConfig } from '@/config/common';
import { buttonVariants } from '@/components/shadcn-ui/button';
import { BrandIcons } from '@/components/shared/brand-icons';
import { Link } from '@/components/shared/link';

export function SiteFooter({ className }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn('container-wrapper', className)}>
      <div className="container flex flex-col items-center justify-between gap-4 border-t py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center font-mono text-xs leading-loose md:text-left">
            &copy; {`${new Date().getFullYear()} ${siteConfig.copyRight}`}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {siteConfig.links.vrchat && (
            <Link
              href={siteConfig.links.vrchat}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'icon' })}
              aria-label="VRChat"
              title="VRChat (mahirooyama)"
            >
              <BrandIcons.vrchat className="size-4" />
            </Link>
          )}
          {siteConfig.email && (
            <Link
              href={`mailto:${siteConfig.email}`}
              className={buttonVariants({ variant: 'outline', size: 'icon' })}
              target="_blank"
              rel="noreferrer"
              aria-label="Email"
              title="Email (mahirooyama)"
            >
              <MailIcon className="size-4" />
            </Link>
          )}
          {siteConfig.links.github && (
            <Link
              href={siteConfig.links.github}
              className={buttonVariants({ variant: 'outline', size: 'icon' })}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              title="GitHub (mahirooyama-blog github repository)"
            >
              <BrandIcons.gitHub className="size-4" />
            </Link>
          )}
          {siteConfig.links.twitter && (
            <Link
              href={siteConfig.links.twitter}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'icon' })}
              aria-label="Twitter"
              title="Twitter (Mahiro___Oyama)"
            >
              <BrandIcons.x className="size-4" />
            </Link>
          )}
          <Link
            href="/rss.xml"
            className={buttonVariants({ variant: 'outline', size: 'icon' })}
            aria-label="RSS"
            title="RSS Feed (mahirooyama-blog)"
          >
            <RssIcon className="size-4" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
