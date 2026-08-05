import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

// Sign-up page - independent layout without site header/footer
interface SignUpLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function SignUpLayout({
  children,
  params,
}: SignUpLayoutProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang, 'login');
  return (
    <DictionaryProvider dictionary={dict}>
      <div className="bg-muted/30 flex min-h-screen">
        <main className="flex-1">{children}</main>
      </div>
    </DictionaryProvider>
  );
}
