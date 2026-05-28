import React from 'react';
import { notFound } from 'next/navigation';
import { tagStore } from '@/store/tag-store';
import { absoluteUrl, formatDate } from '@/utils/utils';

import { siteConfig } from '@/config/config';
import { author } from '@/lib/author';
import { getAllBlogPosts, getBlogPostBySlug } from '@/lib/mdx';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/shadcn-ui/breadcrumb';
import { Author } from '@/components/content/author';
import { CustomMDX } from '@/components/content/custom-mdx';
import { BlurredHeroImage } from '@/components/shared/blurred-hero-image';
import { LinkBadge } from '@/components/shared/link-badge';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const allPosts = await getAllBlogPosts();
  return allPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [post] = await Promise.all([
    getBlogPostBySlug(slug),
    tagStore.getByType('blog'),
  ]);

  if (!post) {
    return {};
  }

  return {
    title: post.metadata.title,
    description: post.metadata.description,
    openGraph: {
      title: post.metadata.title,
      description: post.metadata.description,
      type: 'article',
      url: absoluteUrl(`/blog/${post.slug}`),
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: post.metadata.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.metadata.title,
      description: post.metadata.description,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [post, tags] = await Promise.all([
    getBlogPostBySlug(slug),
    tagStore.getByType('blog'),
  ]);

  if (!post) {
    notFound();
  }

  const breadcrumbItems = [
    ...(post.metadata.tags && post.metadata.tags.length > 0
      ? [
          {
            link: `/tag/blog/${post.metadata.tags[0]}`,
            label: tags[post.metadata.tags[0]]?.name || post.metadata.tags[0],
          },
        ]
      : []),
    {
      link: '',
      label: post.metadata.title,
    },
  ];
  const thumbnailUrl = post.metadata.thumbnail;

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
          {thumbnailUrl && (
            <BlurredHeroImage
              imageUrl={thumbnailUrl}
              alt={`${post.metadata.title} thumbnail image`}
              isPortrait={post.isPortrait}
            />
          )}
        </div>
      </div>
      <div className="container-wrapper py-8">
        <div className="container flex flex-col gap-8">
          <section className="flex-1">
            <article className="relative">
              <header className="mb-10 space-y-2 md:space-y-6">
                {/* Date & Time */}
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
                  {post.metadata.lastUpdated && (
                    <div className="inline-flex items-center gap-1">
                      <time dateTime={post.metadata.lastUpdated}>
                        {`${formatDate(post.metadata.lastUpdated)}`}
                      </time>
                    </div>
                  )}
                  <div className="hidden md:flex md:gap-2">
                    {post.metadata.tags?.map((slug) => (
                      <LinkBadge
                        key={slug}
                        link={`/tag/blog/${slug}`}
                        label={tags[slug]?.name || slug}
                      />
                    ))}
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-lg leading-normal font-bold tracking-tight md:text-2xl md:leading-tight md:font-normal">
                  {post.metadata.title}
                </h1>

                <div className="py-4">
                  <Author
                    name={author.name}
                    twitterId={author.twitter}
                    imageUrl={author.image}
                  />
                </div>
              </header>

              {/* Article Content */}
              <div className="mb-10">
                <CustomMDX source={post.rawContent} />
              </div>

              {/* Share Buttons */}
              {/* <div className="py-4">
                <ArticleShareButtons
                  url={absoluteUrl(`/blog/${slug}`)}
                  title={post.metadata.title}
                  description={post.metadata.description}
                  image={thumbnailUrl}
                />
              </div> */}
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
