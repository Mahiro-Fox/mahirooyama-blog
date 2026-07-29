import { ReactNode } from 'react';
import { getPublicGuestbook } from '@/actions/admin/guestbook-actions';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

import { GuestbookWallDialog } from './guestbook-dialog';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const guestbookDictionary = await getDictionary(lang, 'guestbook');
  return {
    title: guestbookDictionary['guestbook.title'],
    description: guestbookDictionary['guestbook.description'],
    keywords: guestbookDictionary['guestbook.keywords'],
  };
};

interface GuestbookLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function GuestbookLayout({
  children,
  params,
}: GuestbookLayoutProps) {
  const { lang } = await params;
  const [guestbookDictionary, guestbookResult] = await Promise.all([
    getDictionary(lang, 'guestbook'),
    getPublicGuestbook(),
  ]);
  const entries = guestbookResult.success ? guestbookResult.data : [];

  return (
    <DictionaryProvider dictionary={guestbookDictionary}>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold">
            {guestbookDictionary['guestbook.page_title']}
          </h1>
          <p className="text-muted-foreground">
            {guestbookDictionary['guestbook.page_description']}
          </p>
        </div>
        {entries.length === 0 && (
          <div className="text-muted-foreground py-12 text-center">
            {guestbookDictionary['guestbook.no_messages']}
          </div>
        )}
        <GuestbookWallDialog />
        {entries.length !== 0 && children}
      </div>
    </DictionaryProvider>
  );
}
