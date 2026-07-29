import { ReactNode } from 'react';
import { getPublicMoments } from '@/actions/admin/moments-actions';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const momentsDictionary = await getDictionary(lang, 'moments');
  return {
    title: momentsDictionary['moments.title'],
    description: momentsDictionary['moments.description'],
    keywords: momentsDictionary['moments.keywords'],
  };
};

interface MomentsLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function MomentsLayout({
  children,
  params,
}: MomentsLayoutProps) {
  const { lang } = await params;
  const [momentsDictionary, momentsResult] = await Promise.all([
    getDictionary(lang, 'moments'),
    getPublicMoments(),
  ]);
  const moments = momentsResult.success ? momentsResult.data : [];

  return (
    <DictionaryProvider dictionary={momentsDictionary}>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">
            {momentsDictionary['moments.page_title']}
          </h1>
          <p className="text-muted-foreground">
            {momentsDictionary['moments.page_description']}
          </p>
        </div>
        {moments.length !== 0 && children}
      </div>
    </DictionaryProvider>
  );
}
