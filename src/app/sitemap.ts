import type { MetadataRoute } from 'next';
import { tagStore } from '@/store/tag-store';

import { siteConfig } from '@/config/common';
import { getAllGalleryImages } from '@/lib/gallery';
import { getAllBlogPosts } from '@/lib/mdx';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;

  const [blogPosts, galleryImages, allTags] = await Promise.all([
    getAllBlogPosts(),
    getAllGalleryImages(),
    tagStore.getAll(),
  ]);

  // 博客页
  const blogPages = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
  }));

  // 图库页
  const galleryPages = galleryImages.map((gallery) => ({
    url: `${baseUrl}/gallery/${gallery.slug}`,
  }));

  // 标签页
  const tagPages: MetadataRoute.Sitemap = [];
  Object.entries(allTags).forEach(([type, tags]) => {
    Object.keys(tags).forEach((key) => {
      tagPages.push({
        url: `${baseUrl}/tag/${type}/${key}`,
      });
    });
  });

  // 静态页
  const staticRoutes = [
    '/',
    '/guestbook',
    '/midi',
    '/photos',
    '/moments',
    '/image-compressor',
  ];

  const staticPages = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
  }));

  return [...staticPages, ...blogPages, ...galleryPages, ...tagPages];
}
