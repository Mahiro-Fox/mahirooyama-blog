import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { tagStore } from '@/store/tag-store';
import { formatDate } from '@/utils/utils';

import { getAllGalleryImages, getGalleryImageBySlug } from '@/lib/gallery';
import { BlurFade } from '@/components/shadcn-ui/blur-fade';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { BlurredHeroImage } from '@/components/shared/blurred-hero-image';
import { LinkBadge } from '@/components/shared/link-badge';

interface GalleryImagePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const images = await getAllGalleryImages();
  return images.map((image) => ({
    slug: image.slug,
  }));
}

export async function generateMetadata({
  params,
}: GalleryImagePageProps): Promise<Metadata> {
  const { slug } = await params;
  const [image] = await Promise.all([
    getGalleryImageBySlug(slug),
    tagStore.getByType('gallery'),
  ]);

  if (!image) {
    return notFound();
  }

  return {
    title: image.metadata.title,
    description: image.metadata.description,
  };
}

export default async function GalleryImagePage({
  params,
}: GalleryImagePageProps) {
  const { slug } = await params;
  const [image, tags] = await Promise.all([
    getGalleryImageBySlug(slug),
    tagStore.getByType('gallery'),
  ]);

  if (!image) {
    return notFound();
  }

  const breadcrumbItems = [
    ...(image.metadata.tags && image.metadata.tags.length > 0
      ? [
          {
            link: `/tag/gallery/${image.metadata.tags[0]}`,
            label: tags[image.metadata.tags[0]]?.name || image.metadata.tags[0],
          },
        ]
      : []),
    {
      link: '',
      label: image.metadata.title,
    },
  ];
  const thumbnail = image.metadata.thumbnail;
  return (
    <div className="flex flex-1 flex-col">
      <div className="container-wrapper">
        <div className="container">
          <div className="py-4 lg:block">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        </div>
        <div className="pt-4">
          {thumbnail && (
            <BlurredHeroImage
              imageUrl={thumbnail}
              alt={`${image.metadata.title} thumbnail image`}
              isPortrait={image.isPortrait}
            />
          )}
        </div>
        <div className="container-wrapper py-8">
          <div className="container flex flex-col gap-8">
            <section className="flex-1">
              <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
                {image.metadata.lastUpdated && (
                  <div className="inline-flex items-center gap-1">
                    <time dateTime={image.metadata.lastUpdated}>
                      {`${formatDate(image.metadata.lastUpdated)}`}
                    </time>
                  </div>
                )}
                <div className="hidden md:flex md:gap-2">
                  {image.metadata.tags?.map((slug) => (
                    <LinkBadge
                      key={slug}
                      link={`/tag/gallery/${slug}`}
                      label={tags[slug]?.name || slug}
                    />
                  ))}
                </div>
              </div>

              <BlurFade inView delay={0.15} duration={0.5}>
                <div className="mt-6 space-y-2">
                  <h1 className="text-2xl font-medium tracking-tight">
                    {image.metadata.title}
                  </h1>
                  {image.metadata.description && (
                    <p className="text-muted-foreground">
                      {image.metadata.description}
                    </p>
                  )}
                </div>
              </BlurFade>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
