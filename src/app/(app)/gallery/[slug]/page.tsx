import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { getAllGalleryImages, getGalleryImageBySlug } from '@/lib/gallery';
import { galleryTags } from '@/lib/tag';
import { formatDate } from '@/lib/utils';
import { BlurFade } from '@/components/shadcn-ui/blur-fade';
import { Breadcrumb } from '@/components/layout/breadcrumb';
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
  const image = await getGalleryImageBySlug(slug);

  if (!image) {
    return {
      title: 'Image Not Found',
    };
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
  const image = await getGalleryImageBySlug(slug);

  if (!image) {
    notFound();
  }

  const breadcrumbItems = [
    ...(image.metadata.tags && image.metadata.tags.length > 0
      ? [
          {
            link: `/tag/gallery/${image.metadata.tags[0]}`,
            label: galleryTags[image.metadata.tags[0]].name,
          },
        ]
      : []),
    {
      link: '',
      label: image.metadata.title,
    },
  ];
  const src = image.metadata.src;
  return (
    <div className="container-wrapper">
      <div className="container py-8">
        <div className="container">
          <div className="py-4 lg:block">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        </div>
        <div className="mx-auto max-w-4xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
            <Image
              src={src}
              alt={image.metadata.title}
              fill
              loading="eager"
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          </div>
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
            {image.metadata.createdAt && (
              <div className="inline-flex items-center gap-1">
                <time dateTime={image.metadata.createdAt}>
                  {`${formatDate(image.metadata.createdAt)}`}
                </time>
              </div>
            )}
            <div className="hidden md:flex md:gap-2">
              {image.metadata.tags?.map((slug) => (
                <LinkBadge
                  key={slug}
                  link={`/tag/gallery/${slug}`}
                  label={galleryTags[slug]?.name || slug}
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
        </div>
      </div>
    </div>
  );
}
