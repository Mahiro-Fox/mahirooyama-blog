import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

// Login page - independent layout without site header/footer
interface LoginLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LoginLayout({
  children,
  params,
}: LoginLayoutProps) {
  const { lang } = await params;
  const loginDict = await getDictionary(lang, 'login');
  return (
    <DictionaryProvider dictionary={loginDict}>
      <div className="bg-muted/30 flex min-h-screen">
        <main className="flex-1">{children}</main>
      </div>
    </DictionaryProvider>
  );
}
