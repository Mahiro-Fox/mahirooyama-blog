import type { Metadata } from 'next';
import { ThemeProvider } from '@/context/theme-provider';
import { cn } from '@/utils/utils';

import { siteConfig } from '@/config/config';
import { fontVariables } from '@/lib/fonts';
import { Toaster } from '@/components/shadcn-ui/sonner';
import { ImagePreviewProvider } from '@/components/shared/image-preview-provider';
import { TailwindIndicator } from '@/components/shared/tailwind-indicator';

import '@/styles/globals.css';

import { BackToTop } from '@/components/layout/back-to-top';

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  description: siteConfig.description,
  alternates: {
    types: {
      'application/rss+xml': [
        {
          url: '/rss.xml',
          title: 'mahirooyama-blog RSS Feed',
        },
      ],
    },
  },
  keywords: ['博客', 'blog', 'photo', 'post', 'gallery', 'midi'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: process.env.NEXT_PUBLIC_APP_URL!,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [siteConfig.ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@Mahiro___Oyama',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.webp',
    apple: '/apple-touch-icon.webp',
  },
  manifest: `${process.env.NEXT_PUBLIC_APP_URL}/site.webmanifest`,
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* 浏览器内容安全策略 (CSP) 限制了图片加载：当前仅允许 self（当前域名）资源，blob: 格式图片被拦截，且未单独配置 img-src，所以沿用 default-src 规则 */}
        {/* 此设置目前只针对于image-compressor路由 */}
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'self'; img-src 'self' blob: data:;"
        />
      </head>
      <body
        className={cn(
          'text-foreground overscroll-none font-sans antialiased',
          fontVariables
        )}
      >
        <ThemeProvider>
          <ImagePreviewProvider>
            {children}
            <BackToTop />
            <TailwindIndicator />
            <Toaster position="top-center" />
          </ImagePreviewProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
