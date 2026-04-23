import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRightIcon } from 'lucide-react';

import { getAllGalleryImages } from '@/lib/gallery';
import { getAllBlogPosts } from '@/lib/mdx';
import { formatDate } from '@/lib/utils';
import { BlurFade } from '@/components/shadcn-ui/blur-fade';
import { Button } from '@/components/shadcn-ui/button';
import { AboutCta } from '@/components/shared/about-cta';
import { LinkCard } from '@/components/shared/link-card';
import { PartialViewCarousel } from '@/components/shared/partial-view-carousel';

const title = 'Lightweight and Minimalistic Next.js Blog Template';
const description =
  'A minimalistic, easy-to-use blog template built with Next.js. Customize it to your liking and use it for personal blogs, portfolio sites, or tech documentation.';

export const metadata: Metadata = {
  title,
  description,
};

export default async function IndexPage() {
  const allPosts = await getAllBlogPosts();
  const galleryImages = await getAllGalleryImages();

  return (
    <div className="relative flex h-[500px] w-full flex-1 flex-col overflow-hidden">
      <section className="py-8">
        <h2 className="sr-only">Hero Carousel Items</h2>
        <HeroCarousel />
      </section>
      <BlurFade inView duration={0.6}>
        <div className="container-wrapper">
          <div className="container py-6">
            <AboutCta />
          </div>
        </div>
      </BlurFade>
      <div className="container-wrapper">
        <section className="container border-b py-6">
          <div className="flex flex-col gap-1 pb-6">
            <h2 className="text-2xl font-medium tracking-tight">Blogs</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allPosts.slice(0, 6).map((post) => (
              <BlurFade inView key={post.slug}>
                <LinkCard
                  key={post.slug}
                  title={post.metadata.title}
                  imageUrl={post.metadata.thumbnail || '/og.webp'}
                  link={`/blog/${post.slug}`}
                  badgeText={formatDate(post.metadata.createdAt)}
                  description={post.metadata.description}
                  priority={true}
                />
              </BlurFade>
            ))}
          </div>
          <div className="mt-10 text-end">
            <Button asChild variant="ghost" className="h-9 px-2">
              <Link
                href="/page/blog/1"
                className="group inline-flex items-center gap-2"
              >
                <span>{'See more posts'}</span>
                <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
      <div className="container-wrapper py-8">
        <div className="container flex flex-col gap-8 lg:flex-row">
          <section className="flex-1">
            <div className="flex flex-col gap-1 pb-6">
              <h2 className="text-2xl font-medium tracking-tight">Gallery</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.slice(0, 3).map((gallery, index) => (
                <BlurFade inView key={gallery.slug}>
                  <LinkCard
                    key={gallery.slug}
                    title={gallery.metadata.title}
                    imageUrl={gallery.metadata.thumbnail || '/og.webp'}
                    link={`/gallery/${gallery.slug}`}
                    badgeText={formatDate(gallery.metadata.createdAt)}
                    description={gallery.metadata.description}
                    priority={index === 0} // 首屏第一张优先加载
                  />
                </BlurFade>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button asChild variant="ghost" className="h-9 px-2">
                <Link
                  href="/page/gallery/1"
                  className="group inline-flex items-center gap-2"
                >
                  <span>{'See more posts'}</span>
                  <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

async function HeroCarousel() {
  const allPosts = await getAllBlogPosts();

  const carouselItems = allPosts.slice(0, 5).map((post) => ({
    title: post.metadata.title,
    href: `/blog/${post.slug}`,
    imageUrl: post.metadata.thumbnail || '/og.webp',
  }));

  return <PartialViewCarousel items={carouselItems} />;
}
