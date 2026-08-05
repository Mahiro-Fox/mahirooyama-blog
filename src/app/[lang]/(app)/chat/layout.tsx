import { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const dictionary = await getDictionary(lang, 'chat');
  return {
    title: dictionary['chat.title'],
    description: dictionary['chat.description'],
    keywords: dictionary['chat.keyword'],
  };
};

interface ChatLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function ChatLayout({
  children,
  params,
}: ChatLayoutProps) {
  const { lang } = await params;
  const chatDictionary = await getDictionary(lang, 'chat');

  return (
    <DictionaryProvider dictionary={chatDictionary}>
      {children}
    </DictionaryProvider>
  );
}
