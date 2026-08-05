import { MusicProvider } from '@/context/music-provider';
import { getPublicMusic } from '@/actions/admin/music-actions';
import { FloatActions } from '@/components/layout/float-actions';
import { GlobalMusicPlayer } from '@/components/layout/global-music-player';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { PageTracker } from '@/components/shared/tracker';
import { siteConfig } from '@/config/common';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';
import { getCurrentAdminUser } from '@/lib/admin-auth';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const homeDictionary = await getDictionary(lang, 'home');
  const description =
    `${homeDictionary['home.description_1']}${homeDictionary['home.description_2']}${homeDictionary['home.description_3']}`
      .replace(/<a>/g, '')
      .replace(/<\/a>/g, '');
  const metaData = {
    title: {
      title: {
        default: siteConfig.name,
        template: `%s | ${siteConfig.name}`,
      },
      metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
      description,
      alternates: {
        types: {
          'application/rss+xml': [
            {
              url: '/rss.xml',
              title: `${siteConfig.name} RSS Feed`,
            },
          ],
        },
      },
      keywords: homeDictionary['home.keywords'],
      openGraph: {
        type: 'website',
        locale: 'zh_CN',
        url: process.env.NEXT_PUBLIC_APP_URL!,
        title: siteConfig.name,
        description,
        siteName: siteConfig.name,
        images: [siteConfig.ogImage],
      },
      twitter: {
        card: 'summary_large_image',
        title: siteConfig.name,
        description,
        images: [siteConfig.ogImage],
        creator: '@Mahiro___Oyama',
      },
      icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon-16x16.webp',
        apple: '/apple-touch-icon.webp',
      },
      manifest: `${process.env.NEXT_PUBLIC_APP_URL}/site.webmanifest`,
    },
  };
  return metaData;
};

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { lang } = await params;
  const [navDictionary, footerDictionary, homeDictionary, adminUser, musicRes] =
    await Promise.all([
      getDictionary(lang, 'header'),
      getDictionary(lang, 'footer'),
      getDictionary(lang, 'home'),
      getCurrentAdminUser(),
      getPublicMusic(),
    ]);
  const songs = musicRes.success ? musicRes.data : [];
  return (
    <div className="bg-background relative z-10 flex min-h-svh flex-col">
      <DictionaryProvider
        dictionary={{
          ...navDictionary,
          ...footerDictionary,
          ...homeDictionary,
        }}
      >
        <MusicProvider playlist={songs}>
          <SiteHeader initialIsAuth={!!adminUser} />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
          {/* 自动埋点组件 */}
          <PageTracker />
          {/* 浮动操作组件 */}
          <FloatActions />
          {/* 全局音乐播放器组件 */}
          <GlobalMusicPlayer />
        </MusicProvider>
      </DictionaryProvider>
    </div>
  );
}
