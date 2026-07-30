import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/common';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/secret'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
