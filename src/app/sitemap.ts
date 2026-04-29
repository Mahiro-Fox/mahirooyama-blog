import type { MetadataRoute } from 'next';
import { tagStore } from '@/store/tag-store';

import { siteConfig } from '@/config/config';
import { getAllGalleryImages } from '@/lib/gallery';
import { getAllBlogPosts } from '@/lib/mdx';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;

  const [blogPosts, galleryImages, tags] = await Promise.all([
    getAllBlogPosts(),
    getAllGalleryImages(),
    tagStore.getAll(),
  ]);

  const blogPages = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
  }));

  const galleryPages = galleryImages.map((gallery) => ({
    url: `${baseUrl}/gallery/${gallery.slug}`,
  }));

  const blogTagPages = Object.keys(tags.blog).map((slug) => ({
    url: `${baseUrl}/tag/blog/${slug}`,
  }));

  const galleryTagPages = Object.keys(tags.gallery).map((slug) => ({
    url: `${baseUrl}/tag/gallery/${slug}`,
  }));

  const staticPages = [
    {
      url: baseUrl,
    },
  ];

  return [
    ...staticPages,
    ...blogPages,
    ...galleryPages,

    ...blogTagPages,
    ...galleryTagPages,
  ];
}
