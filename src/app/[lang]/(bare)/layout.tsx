import { FloatActions } from '@/components/layout/float-actions';
import { SiteHeader } from '@/components/layout/site-header';
import { PageTracker } from '@/components/shared/tracker';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';
import { getCurrentUser } from '@/lib/user-auth';

interface AppLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { lang } = await params;
  const [navDictionary, footerDictionary, frontendUser] = await Promise.all([
    getDictionary(lang, 'header'),
    getDictionary(lang, 'footer'),
    getCurrentUser(),
  ]);
  return (
    <div className="bg-background relative z-10 flex min-h-svh flex-col">
      <DictionaryProvider
        dictionary={{
          ...navDictionary,
          ...footerDictionary,
        }}
      >
        <SiteHeader initialUserAuth={frontendUser} />
        <main className="flex flex-1 flex-col">{children}</main>
        {/* 自动埋点组件 */}
        <PageTracker />
        {/* 浮动操作组件 */}
        <FloatActions />
      </DictionaryProvider>
    </div>
  );
}
