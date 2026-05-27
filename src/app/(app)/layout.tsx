import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { PageTracker } from '@/components/shared/tracker';
import Head from 'next/head';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="bg-background relative z-10 flex min-h-svh flex-col">
      <Head>
        {/* 浏览器内容安全策略 (CSP) 限制了图片加载：当前仅允许 self（当前域名）资源，blob: 格式图片被拦截，且未单独配置 img-src，所以沿用 default-src 规则 */}
        {/* 此设置目前只针对于image-compressor路由 */}
        <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'self'; img-src 'self' blob: data:;"
        />
      </Head>
      <PageTracker />
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
