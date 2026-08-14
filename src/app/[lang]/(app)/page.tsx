import { AboutCta } from '@/app/[lang]/(app)/_components/about-cta';
import Galleries from '@/app/[lang]/(app)/_components/galleries';
import { HomeBanner } from '@/app/[lang]/(app)/_components/home-banner';
import Posts from '@/app/[lang]/(app)/_components/posts';
import Tags from '@/app/[lang]/(app)/_components/tags';
import { tagStore } from '@/store/tag-store';
import { ChevronDown } from 'lucide-react';
import { getPublicBlogs } from '@/actions/admin/blog-actions';
import { getPublicGalleries } from '@/actions/admin/gallery-actions';
import { getHomeBannerImages } from '@/actions/home-banner';
import { BlurFade } from '@/components/magicui/blur-fade';
import { PartialViewCarousel } from '@/components/shared/partial-view-carousel';
import { VermilionThread } from '@/components/shared/vermilion-thread';
import { Gallery } from '@/lib/gallery';

export default async function IndexPage() {
  const [blogResult, galleryResult, bannerData, tags] = await Promise.all([
    getPublicBlogs({ all: true }),
    getPublicGalleries(),
    getHomeBannerImages(),
    tagStore.getAll(),
  ]);
  const allPosts = blogResult.success ? blogResult.data.items : [];
  const galleries = galleryResult.success ? galleryResult.data.items : [];

  const initialIndex = bannerData
    ? Math.floor(Math.random() * bannerData.length)
    : 0;

  return (
    <div className="relative flex w-full flex-1 flex-col">
      {/* ── Hero Banner ── */}
      <section className="relative h-[calc(100vh-48px)] w-full md:h-[calc(100vh-64px)]">
        {bannerData && (
          <HomeBanner images={bannerData} initialIndex={initialIndex} />
        )}
        {/* 底部渐变遮罩 — 从透明过渡到墨色背景 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />
        <ChevronDown
          strokeWidth={3}
          className="animate-up-down absolute right-[50%] bottom-10 z-10 text-[var(--primary)]/70"
        />
      </section>

      {/* ── Gallery Carousel ── */}
      <section className="pt-12 pb-4">
        <HeroCarousel galleries={galleries} />
      </section>

      <VermilionThread className="py-4" />

      {/* ── About Section ── */}
      <BlurFade inView duration={0.6}>
        <section className="container-wrapper py-8">
          <div className="container">
            <AboutCta />
          </div>
        </section>
      </BlurFade>

      <VermilionThread className="py-4" />

      {/* ── Galleries & Tags ── */}
      <section className="container-wrapper py-8">
        <div className="container flex flex-col gap-10 lg:flex-row">
          <Galleries galleries={galleries} />
          <Tags tags={tags} />
        </div>
      </section>

      <VermilionThread className="py-4" />

      {/* ── Posts ── */}
      <Posts posts={allPosts} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            '@id': 'https://mahirooyama.cn',
            name: 'mahirooyama-blog',
            url: 'https://mahirooyama.cn',
          }),
        }}
      />
    </div>
  );
}

async function HeroCarousel({ galleries }: { galleries: Gallery[] }) {
  const carouselItems = galleries.slice(0, 5).map((image) => ({
    title: image.title,
    description: image.description || '',
    href: `/gallery/${image.slug}`,
    imageUrl: image.thumbnail,
  }));

  return <PartialViewCarousel items={carouselItems} />;
}
