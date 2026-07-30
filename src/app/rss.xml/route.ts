import { NextResponse } from 'next/server';
import { getPublicBlogs } from '@/actions/admin/blog-actions';
import { getPublicGalleries } from '@/actions/admin/gallery-actions';
import { siteConfig } from '@/config/common';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;
  const blogResult = await getPublicBlogs({ all: true });
  const posts = blogResult.success ? blogResult.data.items : [];

  const galleryResult = await getPublicGalleries({ all: true });
  const galleryImages = galleryResult.success ? galleryResult.data.items : [];
  const rssXml = `
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>${siteConfig.name}</title>
        <link>${baseUrl}</link>
        <description>${siteConfig.description}</description>
        <language>ja</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
        ${posts
          .map((post) => {
            return `
              <item>
                <title><![CDATA[${post.title}]]></title>
                <link>${baseUrl}/blog/${post.slug}</link>
                <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
                <pubDate>${new Date(post.lastUpdated).toUTCString()}</pubDate>
                <description><![CDATA[${post.description || ''}]]></description>
                ${
                  post.tags
                    ? post.tags
                        .map((tag) => `<category>${tag}</category>`)
                        .join('')
                    : ''
                }
              </item>
            `;
          })
          .join('')}
        ${galleryImages
          .map((gallery) => {
            return `
              <item>
                <title><![CDATA[${gallery.title}]]></title>
                <link>${baseUrl}/gallery/${gallery.slug}</link>
                <guid isPermaLink="true">${baseUrl}/gallery/${gallery.slug}</guid>
                <pubDate>${
                  gallery.lastUpdated
                    ? new Date(gallery.lastUpdated).toUTCString()
                    : ''
                }</pubDate>
                <description><![CDATA[${gallery.description || ''}]]></description>
                ${
                  gallery.tags
                    ? gallery.tags
                        .map((tag) => `<category>${tag}</category>`)
                        .join('')
                    : ''
                }
              </item>
            `;
          })
          .join('')}
      </channel>
    </rss>
  `.trim();

  return new NextResponse(rssXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
