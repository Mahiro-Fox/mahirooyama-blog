import { getPublicMusic } from '@/actions/admin/music-actions';
import { MusicProvider } from '@/context/music-provider';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

import { getCurrentAdminUser } from '@/lib/admin-auth';
import { BackToTop } from '@/components/layout/back-to-top';
import { BugReportTrigger } from '@/components/layout/bug-report-trigger';
import { GlobalMusicPlayer } from '@/components/layout/global-music-player';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { PageTracker } from '@/components/shared/tracker';

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { lang } = await params;
  const [navDictionary, footerDictionary, adminUser, musicRes] =
    await Promise.all([
      getDictionary(lang, 'header'),
      getDictionary(lang, 'footer'),
      getCurrentAdminUser(),
      getPublicMusic(),
    ]);
  const songs = musicRes.success ? musicRes.data : [];
  return (
    <div className="bg-background relative z-10 flex min-h-svh flex-col">
      <DictionaryProvider
        dictionary={{ ...navDictionary, ...footerDictionary }}
      >
        <MusicProvider playlist={songs}>
          <PageTracker />
          <SiteHeader initialIsAuth={!!adminUser} />
          <main className="flex flex-1 flex-col">{children}</main>
          <BackToTop />
          <BugReportTrigger />
          <SiteFooter />
          <GlobalMusicPlayer />
        </MusicProvider>
      </DictionaryProvider>
    </div>
  );
}
