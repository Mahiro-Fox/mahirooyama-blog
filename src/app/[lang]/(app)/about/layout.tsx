import { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const aboutDictionary = await getDictionary(lang, 'about');
  return {
    title: aboutDictionary['about.title'],
    description: aboutDictionary['about.description'],
    keywords: aboutDictionary['about.keywords'],
  };
};

interface AboutLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function AboutLayout({
  children,
  params,
}: AboutLayoutProps) {
  const { lang } = await params;
  const aboutDictionary = await getDictionary(lang, 'about');
  return (
    <DictionaryProvider dictionary={aboutDictionary}>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold">
            {aboutDictionary['about.title']}
          </h1>
          <p className="text-muted-foreground">
            {aboutDictionary['about.description']}
          </p>
        </div>
        {children}
      </div>
    </DictionaryProvider>
  );
}
