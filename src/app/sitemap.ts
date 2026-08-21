import { tagStore } from '@/store/tag-store';
import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { getPublicBlogs } from '@/actions/admin/blog-actions';
import { getPublicGalleries } from '@/actions/admin/gallery-actions';
import { getPublicMovies } from '@/actions/admin/movie-actions';
import { siteConfig } from '@/config/common';

// 路由本身声明为动态,保证构建时绝不执行
export const dynamic = 'force-dynamic';

// 把实际的数据获取逻辑包一层缓存,1小时内多次请求复用同一份结果
const getCachedSitemapData = unstable_cache(
  async () => {
    const [blogResult, galleryResult, movieResult, tagsResult] =
      await Promise.allSettled([
        getPublicBlogs({ all: true }),
        getPublicGalleries({ all: true }),
        getPublicMovies(),
        tagStore.getAll(),
      ]);

    return {
      blogPosts:
        blogResult.status === 'fulfilled' && blogResult.value.success
          ? blogResult.value.data.items
          : [],
      galleryItems:
        galleryResult.status === 'fulfilled' && galleryResult.value.success
          ? galleryResult.value.data.items
          : [],
      movieItems:
        movieResult.status === 'fulfilled' && movieResult.value.success
          ? movieResult.value.data
          : [],
      allTags: tagsResult.status === 'fulfilled' ? tagsResult.value : null,
    };
  },
  ['sitemap-data'], // 缓存 key
  { revalidate: 3600 } // 1小时重新拉取一次
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;

  const { blogPosts, galleryItems, movieItems, allTags } =
    await getCachedSitemapData();

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
  if (allTags) {
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
  }

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
