import { notFound } from 'next/navigation';
import { tagStore } from '@/store/tag-store';
import { absoluteUrl, formatDate } from '@/utils/utils';

import { siteConfig } from '@/config/config';
import { getGalleryPostsByTagSlug } from '@/lib/gallery';
import { Badge } from '@/components/shadcn-ui/badge';
import { TextAnimate } from '@/components/shadcn-ui/text-animate';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { AboutCta } from '@/components/shared/about-cta';
import { BrandIcons } from '@/components/shared/brand-icons';
import { LinkCard } from '@/components/shared/link-card';

interface GalleryTagPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const tags = await tagStore.getByType('gallery');
  return Object.keys(tags).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: GalleryTagPageProps) {
  const { slug } = await params;
  const tags = await tagStore.getByType('gallery');
  const tag = tags[slug];

  if (!tag) {
    return {};
  }

  return {
    title: `images with "${tag.name}" tag`,
    description: `gallery list with "${tag.name}" tag`,
    openGraph: {
      title: `images with "${tag.name}" tag`,
      description: `gallery list with "${tag.name}" tag`,
      type: 'article',
      url: absoluteUrl(`/tag/gallery/${slug}`),
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: `image with "${tag.name}" tag`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `images with "${tag.name}" tag`,
      description: `gallery list with "${tag.name}" tag`,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function GalleryTagPage({ params }: GalleryTagPageProps) {
  const { slug } = await params;
  const tags = await tagStore.getByType('gallery');
  const tag = tags[slug];

  if (!tag) {
    return notFound();
  }

  const data = await getGalleryPostsByTagSlug(slug);

  const breadcrumbItems = [
    {
      link: '/page/gallery/1',
      label: 'Gallery',
    },
    {
      link: '',
      label: tag.name,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="container-wrapper">
        <div className="container">
          <div className="hidden py-4 lg:block">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        </div>
      </div>
      <div className="container-wrapper">
        <div className="container py-6">
          <AboutCta />
        </div>
        <div className="container pb-6">
          <CardTagTitle
            icon={tag.icon as keyof typeof BrandIcons}
            name={tag.name}
            postCount={data?.length || 0}
          />
        </div>
      </div>
      <div className="container-wrapper">
        <div className="container flex flex-col gap-1">
          <section className="container border-b py-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data?.map((item) => (
                <LinkCard
                  key={item.slug}
                  title={item.metadata.title}
                  imageUrl={item.metadata.thumbnail || siteConfig.ogImage}
                  link={`/gallery/${item.slug}`}
                  badgeText={formatDate(item.metadata.lastUpdated || '')}
                  description={item.metadata.description}
                  priority={true}
                  isPortrait={item.isPortrait}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CardTagTitle({
  icon,
  name,
  postCount,
}: {
  icon: keyof typeof BrandIcons;
  name: string;
  postCount: number;
}) {
  const TagIcon = BrandIcons[icon];

  return (
    <div className="pb-8">
      <div className="from-primary/5 via-primary/3 ring-primary/10 relative overflow-hidden rounded-2xl bg-gradient-to-br to-transparent p-6 ring-1">
        <div className="bg-primary/5 absolute -top-4 -right-4 h-24 w-24 rounded-full"></div>
        <div className="relative flex items-start gap-4">
          <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-xl">
            <TagIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                TAG
              </Badge>
              {postCount && (
                <span className="text-muted-foreground text-sm">
                  • {postCount} images
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            <TextAnimate
              animation="blurIn"
              as="p"
              className="text-muted-foreground mt-1"
            >
              {`Explore all images tagged with ${name}`}
            </TextAnimate>
          </div>
        </div>
      </div>
    </div>
  );
}
