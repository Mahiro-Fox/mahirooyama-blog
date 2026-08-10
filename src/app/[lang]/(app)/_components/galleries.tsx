'use client';

import { siteConfig } from '@/config';
import { ChevronRightIcon } from 'lucide-react';
import { BlurFade } from '@/components/magicui/blur-fade';
import { Button } from '@/components/shadcn-ui/button';
import { Link } from '@/components/shared/link';
import { LinkCard } from '@/components/shared/link-card';
import { useT } from '@/i18n/dictionary-provider';
import { Gallery } from '@/lib/gallery';
import { formatDate } from '@/utils/utils';

export default function Galleries({ galleries }: { galleries: Gallery[] }) {
  const t = useT();
  return (
    <section className="flex-2">
      <div className="flex flex-col gap-1 pb-6">
        <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight">
          <span className="block h-5 w-1 rounded-full bg-[var(--primary)]" />
          {t('home.galleries')}
        </h2>
      </div>
      <div className="flex flex-col">
        {galleries.slice(0, 3).map((gallery, index) => (
          <BlurFade inView key={gallery.slug}>
            <LinkCard
              key={gallery.slug}
              title={gallery.title}
              imageUrl={gallery.thumbnail || siteConfig.ogImage}
              link={`/gallery/${gallery.slug}`}
              badgeText={formatDate(gallery.lastUpdated)}
              description={gallery.description}
              priority={index === 0} // 首屏第一张优先加载
              isPortrait={gallery.isPortrait}
            />
          </BlurFade>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button asChild variant="ghost" className="h-9 px-2">
          <Link
            href="/page/gallery/1"
            className="group inline-flex items-center gap-2 transition-colors hover:text-[var(--primary)]"
          >
            <span>{t('home.see_more_galleries')}</span>
            <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
