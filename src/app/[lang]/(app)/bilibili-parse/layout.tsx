import { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const bilibiliDictionary = await getDictionary(lang, 'bilibili-parse');
  const title = bilibiliDictionary['bilibili-parse.title'];
  const description = bilibiliDictionary['bilibili-parse.description'];
  return {
    title,
    description,
    keywords: bilibiliDictionary['bilibili-parse.keyword'],
  };
};

interface BilibiliParseLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function BilibiliParseLayout({
  children,
  params,
}: BilibiliParseLayoutProps) {
  const { lang } = await params;
  const bilibiliDictionary = await getDictionary(lang, 'bilibili-parse');

  return (
    <DictionaryProvider dictionary={bilibiliDictionary}>
      <div className="container-wrapper">
        <div className="container py-8">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-medium tracking-tight">
              {bilibiliDictionary['bilibili-parse.title']}
            </h1>
            <p className="text-muted-foreground">
              {bilibiliDictionary['bilibili-parse.description']}
              <strong className="text-destructive">
                &nbsp;{bilibiliDictionary['bilibili-parse.notice']}
              </strong>
            </p>
          </div>
          {children}
        </div>
      </div>
    </DictionaryProvider>
  );
}
