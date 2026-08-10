'use client';

import { siteConfig } from '@/config';
import { ChevronRightIcon } from 'lucide-react';
import { BlurFade } from '@/components/magicui/blur-fade';
import { Button } from '@/components/shadcn-ui/button';
import { Link } from '@/components/shared/link';
import { LinkCard } from '@/components/shared/link-card';
import { useT } from '@/i18n/dictionary-provider';
import { Blog } from '@/lib/blog';
import { formatDate } from '@/utils/utils';

export default function Posts({ posts }: { posts: Blog[] }) {
  const t = useT();
  return (
    <section className="container-wrapper">
      <section className="container border-b py-6">
        <div className="flex flex-col gap-1 pb-6">
          <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight">
            <span className="block h-5 w-1 rounded-full bg-[var(--primary)]" />
            {t('home.posts')}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 6).map((post, index) => (
            <BlurFade inView key={post.slug}>
              <LinkCard
                key={post.slug}
                title={post.title}
                imageUrl={post.thumbnail || siteConfig.ogImage}
                link={`/blog/${post.slug}`}
                badgeText={formatDate(post.lastUpdated)}
                description={post.description}
                priority={index === 0}
                isPortrait={post.isPortrait}
              />
            </BlurFade>
          ))}
        </div>
        <div className="mt-10 text-end">
          <Button asChild variant="ghost" className="h-9 px-2">
            <Link
              href="/page/blog/1"
              className="group inline-flex items-center gap-2 transition-colors hover:text-[var(--primary)]"
            >
              <span>{t('home.see_more_posts')}</span>
              <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>
    </section>
  );
}
