import { tagStore } from '@/store/tag-store';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import React from 'react';
import { getPublicGallery } from '@/actions/admin/gallery-actions';
import { BlurFade } from '@/components/magicui/blur-fade';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/shadcn-ui/breadcrumb';
import { BlurredHeroImage } from '@/components/shared/blurred-hero-image';
import { LinkBadge } from '@/components/shared/link-badge';
import { i18nConfig } from '@/i18n/i18n.config';
import { getGalleries } from '@/lib/gallery';
import { formatDate } from '@/utils/utils';

interface GalleryImagePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const images = await getGalleries();
  return i18nConfig.locales.flatMap((locale) =>
    images.map((image) => ({
      slug: image.slug,
      lang: locale,
    }))
  );
}

export async function generateMetadata({
  params,
}: GalleryImagePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicGallery(slug);
  const image = result.success ? result.data : null;

  if (!image) {
    return notFound();
  }

  return {
    title: image.title,
    description: image.description,
  };
}

export default async function GalleryImagePage({
  params,
}: GalleryImagePageProps) {
  const { slug } = await params;
  const [result, tags] = await Promise.all([
    getPublicGallery(slug),
    tagStore.getByType('gallery'),
  ]);
  const image = result.success ? result.data : null;

  if (!image) {
    return notFound();
  }

  const breadcrumbItems = [
    ...(image.tags && image.tags.length > 0
      ? [
          {
            link: `/tag/gallery/${image.tags[0]}`,
            label: tags[image.tags[0]]?.name || image.tags[0],
          },
        ]
      : []),
    {
      link: '',
      label: image.title,
    },
  ];
  const thumbnail = image.thumbnail;
  return (
    <div className="flex flex-1 flex-col">
      <div className="container-wrapper">
        <div className="container">
          <div className="py-4 lg:block">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {breadcrumbItems.map((item, index) => (
                  <React.Fragment key={`breadcrumb_items_${index}`}>
                    <BreadcrumbItem className={item.link && 'hover:underline'}>
                      {item.link ? (
                        <BreadcrumbLink href={item.link}>
                          {item.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {breadcrumbItems.length - 1 > index && (
                      <BreadcrumbSeparator />
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <div className="pt-4">
          {thumbnail && (
            <BlurredHeroImage
              imageUrl={thumbnail}
              alt={`${image.title} thumbnail image`}
              isPortrait={image.isPortrait}
            />
          )}
        </div>
        <div className="container-wrapper py-8">
          <div className="container flex flex-col gap-8">
            <section className="flex-1">
              <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
                {image.lastUpdated && (
                  <div className="inline-flex items-center gap-1">
                    <time dateTime={image.lastUpdated}>
                      {`${formatDate(image.lastUpdated)}`}
                    </time>
                  </div>
                )}
                <div className="hidden md:flex md:gap-2">
                  {image.tags?.map((slug) => (
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
                    {image.title}
                  </h1>
                  {image.description && (
                    <p className="text-muted-foreground">{image.description}</p>
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
