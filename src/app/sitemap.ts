import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/config';
import { getAllGalleryImages } from '@/lib/gallery';
import { getAllBlogPosts } from '@/lib/mdx';
import { blogTags, galleryTags } from '@/lib/tag';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;

  const blogPosts = await getAllBlogPosts();
  const galleryImages = await getAllGalleryImages();

  const blogPages = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
  }));

  const galleryPages = galleryImages.map((gallery) => ({
    url: `${baseUrl}/gallery/${gallery.slug}`,
  }));

  const blogTagPages = Object.keys(blogTags).map((slug) => ({
    url: `${baseUrl}/tag/blog/${slug}`,
  }));

  const galleryTagPages = Object.keys(galleryTags).map((slug) => ({
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
