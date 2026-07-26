import { NextResponse } from 'next/server';
import { getPublicGalleries } from '@/actions/admin/gallery-actions';

import { siteConfig } from '@/config/common';
import { getAllBlogPosts } from '@/lib/mdx';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || siteConfig.url;
  const posts = await getAllBlogPosts();

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
                <title><![CDATA[${post.metadata.title}]]></title>
                <link>${baseUrl}/blog/${post.slug}</link>
                <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
                <pubDate>${new Date(post.metadata.lastUpdated).toUTCString()}</pubDate>
                <description><![CDATA[${post.metadata.description || ''}]]></description>
                ${
                  post.metadata.tags
                    ? post.metadata.tags
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
