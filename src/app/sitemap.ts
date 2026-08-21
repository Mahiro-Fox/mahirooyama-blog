import { tagStore } from '@/store/tag-store';
import type { MetadataRoute } from 'next';
import { getPublicBlogs } from '@/actions/admin/blog-actions';
import { getPublicGalleries } from '@/actions/admin/gallery-actions';
import { getPublicMovies } from '@/actions/admin/movie-actions';
import { siteConfig } from '@/config/common';

export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;

  const [blogResult, galleryResult, movieResult, allTags] = await Promise.all([
    getPublicBlogs({ all: true }),
    getPublicGalleries({ all: true }),
    getPublicMovies(),
    tagStore.getAll(),
  ]);
  const blogPosts = blogResult.success ? blogResult.data.items : [];
  const galleryItems = galleryResult.success ? galleryResult.data.items : [];
  const movieItems = movieResult.success ? movieResult.data : [];

  // 博客页
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.lastUpdated,
    priority: 0.9,
    changeFrequency: 'weekly',
  }));

  // 图库页
  const galleryPages: MetadataRoute.Sitemap = galleryItems.map((gallery) => ({
    url: `${baseUrl}/gallery/${gallery.slug}`,
    lastModified: gallery.lastUpdated,
    priority: 0.9,
    changeFrequency: 'weekly',
  }));

  // 标签页
  const tagPages: MetadataRoute.Sitemap = [];
  Object.entries(allTags).forEach(([type, tags]) => {
    Object.entries(tags).forEach(([key, value]) => {
      tagPages.push({
        url: `${baseUrl}/tag/${type}/${key}`,
        lastModified: value.lastUpdated,
        priority: 0.8,
        changeFrequency: 'weekly',
      });
    });
  });

  // 电影页
  const moviePages: MetadataRoute.Sitemap = movieItems.map((movie) => ({
    url: `${baseUrl}/movie/${movie.id}`,
    lastModified: movie.updated_at,
    priority: 0.7,
    changeFrequency: 'weekly',
  }));

  // 静态页
  const staticRoutes = [
    '/',
    '/guestbook',
    '/midi',
    '/photos',
    '/moments',
    '/movies',
    '/image-compressor',
  ];

  const staticPages: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    priority: 1,
    changeFrequency: 'weekly',
  }));

  return [
    ...staticPages,
    ...blogPages,
    ...galleryPages,
    ...tagPages,
    ...moviePages,
  ];
}
