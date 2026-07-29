import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicBlogs } from '@/actions/admin/blog-actions';
import { tagStore } from '@/store/tag-store';
import { absoluteUrl, formatDate } from '@/utils/utils';

import { siteConfig } from '@/config/common';
import { Badge } from '@/components/shadcn-ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/shadcn-ui/breadcrumb';
import { TextAnimate } from '@/components/shadcn-ui/text-animate';
import { BrandIcons } from '@/components/shared/brand-icons';
import { LinkCard } from '@/components/shared/link-card';
import { AboutCta } from '@/app/[lang]/(app)/_components/about-cta';

interface BlogTagPageProps {
  params: Promise<{ slug: string }>;
}
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const tags = await tagStore.getByType('blog');
  return Object.keys(tags).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: BlogTagPageProps) {
  const { slug } = await params;
  const tags = await tagStore.getByType('blog');
  const tag = tags[slug];

  if (!tag) {
    return {};
  }

  return {
    title: `posts with "${tag.name}" tag`,
    description: `post list with "${tag.name}" tag`,
    openGraph: {
      title: `posts with "${tag.name}" tag`,
      description: `post list with "${tag.name}" tag`,
      type: 'article',
      url: absoluteUrl(`/tag/blog/${slug}`),
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: `post with "${tag.name}" tag`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `posts with "${tag.name}" tag`,
      description: `post list with "${tag.name}" tag`,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function BlogTagPage({ params }: BlogTagPageProps) {
  const { slug } = await params;
  const tags = await tagStore.getByType('blog');
  const tag = tags[slug];

  if (!tag) {
    return notFound();
  }

  const blogResult = await getPublicBlogs({ tagSlug: slug, all: true });
  const posts = blogResult.success ? blogResult.data.items : [];

  const breadcrumbItems = [
    {
      link: '/page/blog/1',
      label: 'Blog',
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
      </div>
      <div className="container-wrapper">
        <div className="container py-6">
          <AboutCta />
        </div>
        <div className="container pb-6">
          <CardTagTitle
            icon={tag.icon as keyof typeof BrandIcons}
            name={tag.name}
            postCount={posts.length}
          />
        </div>
      </div>
      <div className="container-wrapper">
        <div className="container flex flex-col gap-1">
          <section className="container border-b py-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((item) => (
                <LinkCard
                  key={item.slug}
                  title={item.title}
                  imageUrl={item.thumbnail || siteConfig.ogImage}
                  link={`/blog/${item.slug}`}
                  badgeText={formatDate(item.lastUpdated)}
                  description={item.description}
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
                  • {postCount} posts
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            <TextAnimate
              animation="blurIn"
              as="p"
              className="text-muted-foreground mt-1"
            >
              {`Explore all posts tagged with ${name}`}
            </TextAnimate>
          </div>
        </div>
      </div>
    </div>
  );
}
