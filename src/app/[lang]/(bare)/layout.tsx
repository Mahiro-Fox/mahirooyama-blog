import { FloatActions } from '@/components/layout/float-actions';
import { SiteHeader } from '@/components/layout/site-header';
import { PageTracker } from '@/components/shared/tracker';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';
import { getCurrentUser } from '@/lib/user-auth';

interface BareLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function BareLayout({
  children,
  params,
}: BareLayoutProps) {
  const { lang } = await params;
  const [navDictionary, frontendUser] = await Promise.all([
    getDictionary(lang, 'header'),
    getCurrentUser(),
  ]);
  return (
    <div className="bg-background relative z-10 flex min-h-svh flex-col">
      <DictionaryProvider dictionary={navDictionary}>
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
