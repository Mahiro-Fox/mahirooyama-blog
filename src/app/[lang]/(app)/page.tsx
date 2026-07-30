import { AboutCta } from '@/app/[lang]/(app)/_components/about-cta';
import Galleries from '@/app/[lang]/(app)/_components/galleries';
import { HomeBanner } from '@/app/[lang]/(app)/_components/home-banner';
import Posts from '@/app/[lang]/(app)/_components/posts';
import Tags from '@/app/[lang]/(app)/_components/tags';
import { tagStore } from '@/store/tag-store';
import { getPublicBlogs } from '@/actions/admin/blog-actions';
import { getPublicGalleries } from '@/actions/admin/gallery-actions';
import { getHomeBannerImages } from '@/actions/home-banner';
import { BlurFade } from '@/components/shadcn-ui/blur-fade';
import { PartialViewCarousel } from '@/components/shared/partial-view-carousel';
import { Gallery } from '@/lib/gallery';

export default async function IndexPage() {
  const blogResult = await getPublicBlogs({ all: true });
  const allPosts = blogResult.success ? blogResult.data.items : [];
  const galleryResult = await getPublicGalleries();
  const galleries = galleryResult.success ? galleryResult.data.items : [];
  const bannerData = await getHomeBannerImages();
  const tags = await tagStore.getAll();

  const initialIndex = bannerData
    ? Math.floor(Math.random() * bannerData.length)
    : 0;
  return (
    <div className="relative flex w-full flex-1 flex-col">
      {/* Hero Banner - 100vh */}
      {bannerData && (
        <HomeBanner images={bannerData} initialIndex={initialIndex} />
      )}
      <section className="py-8">
        <HeroCarousel galleries={galleries} />
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
          <Galleries galleries={galleries} />
          {/* Tags */}
          <Tags tags={tags} />
        </div>
      </div>
      {/* Posts */}
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
    href: `/gallery/${image.slug}`,
    imageUrl: image.thumbnail,
  }));

  return <PartialViewCarousel items={carouselItems} />;
}
