import type { Metadata } from 'next';
import Link from 'next/link';
import { getHomeBannerImages } from '@/actions/home-banner';
import { tagStore } from '@/store/tag-store';
import { formatDate } from '@/utils/utils';
import { ChevronRightIcon } from 'lucide-react';

import { siteConfig } from '@/config/config';
import { GalleryImageData, getAllGalleryImages } from '@/lib/gallery';
import { getAllBlogPosts } from '@/lib/mdx';
import { BlurFade } from '@/components/shadcn-ui/blur-fade';
import { Button } from '@/components/shadcn-ui/button';
import { AboutCta } from '@/components/shared/about-cta';
import { HomeBanner } from '@/components/shared/home-banner';
import { LinkCard } from '@/components/shared/link-card';
import { PartialViewCarousel } from '@/components/shared/partial-view-carousel';
import { EventTracker } from '@/components/shared/tracker';

const title = "欢迎来到 mahirooyama 的网站喵~ - Welcome to mahiooyama's blog";
const description = `本网站主要内容是一些照片，例如和朋友在VRChat里拍的照片。如果想上传照片，可以在 VRChat 联系我哦~ 次要内容是一些编程笔记和其他技术分享，后续也可能加入一些新的内容与功能~ 源代码在 GitHub ，欢迎查看哦~ - 
  The main content of this website consists of some photos, such as those taken in VRChat with friends. If you'd like to upload photos, feel free to contact me in VRChat~
  The secondary content includes some programming notes and other technical shares, with potential additions of new content and features in the future
  The source code is on GitHub. Feel free to check it out~`;

export const metadata: Metadata = {
  title,
  description,
};

export default async function IndexPage() {
  const allPosts = await getAllBlogPosts();
  const galleryImages = await getAllGalleryImages();
  const bannerData = await getHomeBannerImages();
  const tags = await tagStore.getAll();

  return (
    <div className="relative flex w-full flex-1 flex-col">
      <EventTracker
        eventName="index_page_loaded"
        properties={{
          postCount: allPosts.length,
          imageCount: galleryImages.length,
        }}
      />
      {/* Hero Banner - 100vh */}
      {bannerData && <HomeBanner images={bannerData} />}
      <section className="py-8">
        <h2 className="sr-only">Hero Carousel Items</h2>
        <HeroCarousel galleryImages={galleryImages} />
      </section>
      {/* About Section */}
      <BlurFade inView duration={0.6}>
        <div className="container-wrapper">
          <div className="container py-12">
            <AboutCta />
          </div>
        </div>
      </BlurFade>
      <div className="container-wrapper py-8">
        <div className="container flex flex-col gap-8 lg:flex-row">
          {/* Gallery */}
          <section className="flex-2">
            <div className="flex flex-col gap-1 pb-6">
              <h2 className="text-2xl font-medium tracking-tight">Gallery</h2>
            </div>
            <div className="flex flex-col">
              {galleryImages.slice(0, 3).map((gallery, index) => (
                <BlurFade inView key={gallery.slug}>
                  <LinkCard
                    key={gallery.slug}
                    title={gallery.metadata.title}
                    imageUrl={gallery.metadata.thumbnail || siteConfig.ogImage}
                    link={`/gallery/${gallery.slug}`}
                    badgeText={formatDate(gallery.metadata.lastUpdated)}
                    description={gallery.metadata.description}
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
                  className="group inline-flex items-center gap-2"
                >
                  <span>{'See more galleries'}</span>
                  <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </section>
          {/* Tags */}
          <section className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-medium tracking-tight">Tags</h2>
            </div>
            {/* @ts-ignore */}
            {Object.entries<Record<string, Tag>>(tags).map(([key, value]) => (
              <div key={key} className="flex flex-wrap gap-2">
                {Object.values(value).map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${key}/${tag.id}`}
                    className="hover:bg-muted flex cursor-pointer items-center justify-center rounded-lg border p-2 transition-colors"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            ))}
          </section>
        </div>
      </div>
      {/* Blogs */}
      <div className="container-wrapper">
        <section className="container border-b py-6">
          <div className="flex flex-col gap-1 pb-6">
            <h2 className="text-2xl font-medium tracking-tight">Blogs</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allPosts.slice(0, 6).map((post, index) => (
              <BlurFade inView key={post.slug}>
                <LinkCard
                  key={post.slug}
                  title={post.metadata.title}
                  imageUrl={post.metadata.thumbnail || siteConfig.ogImage}
                  link={`/blog/${post.slug}`}
                  badgeText={formatDate(post.metadata.lastUpdated)}
                  description={post.metadata.description}
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
  );
}
async function HeroCarousel({
  galleryImages,
}: {
  galleryImages: GalleryImageData[];
}) {
  const carouselItems = galleryImages.slice(0, 5).map((image) => ({
    title: image.metadata.title,
    href: `/gallery/${image.slug}`,
    imageUrl: image.metadata.thumbnail,
  }));

  return <PartialViewCarousel items={carouselItems} />;
}
