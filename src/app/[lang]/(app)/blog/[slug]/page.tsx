import { tagStore } from '@/store/tag-store';
import { notFound } from 'next/navigation';
import React from 'react';
import { getPublicBlog } from '@/actions/admin/blog-actions';
import { Author } from '@/components/content/author';
import { CustomMDX } from '@/components/content/custom-mdx';
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
import { siteConfig } from '@/config/common';
import { i18nConfig } from '@/i18n/i18n.config';
import { author } from '@/lib/author';
import { getBlogs } from '@/lib/blog';
import { absoluteUrl, formatDate } from '@/utils/utils';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const allPosts = await getBlogs();
  return i18nConfig.locales.flatMap((locale) =>
    allPosts.map((post) => ({
      slug: post.slug,
      lang: locale,
    }))
  );
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [postResult] = await Promise.all([
    getPublicBlog(slug),
    tagStore.getByType('blog'),
  ]);

  if (!postResult.success) {
    return {};
  }
  const post = postResult.data;

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: absoluteUrl(`/blog/${post.slug}`),
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [postResult, tags] = await Promise.all([
    getPublicBlog(slug),
    tagStore.getByType('blog'),
  ]);

  if (!postResult.success) {
    notFound();
  }
  const post = postResult.data;

  const breadcrumbItems = [
    ...(post.tags && post.tags.length > 0
      ? [
          {
            link: `/tag/blog/${post.tags[0]}`,
            label: tags[post.tags[0]]?.name || post.tags[0],
          },
        ]
      : []),
    {
      link: '',
      label: post.title,
    },
  ];
  const thumbnailUrl = post.thumbnail;

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
                  <React.Fragment key={item.link || item.label}>
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
              alt={`${post.title} thumbnail image`}
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
                  {post.lastUpdated && (
                    <div className="inline-flex items-center gap-1">
                      <time dateTime={post.lastUpdated}>
                        {`${formatDate(post.lastUpdated)}`}
                      </time>
                    </div>
                  )}
                  <div className="hidden md:flex md:gap-2">
                    {post.tags?.map((slug) => (
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
                  {post.title}
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
                <CustomMDX source={post.renderContent} />
              </div>

              {/* Share Buttons */}
              {/* <div className="py-4">
                <ArticleShareButtons
                  url={absoluteUrl(`/blog/${slug}`)}
                  title={post.title}
                  description={post.description}
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
