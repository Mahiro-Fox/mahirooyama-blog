import { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ lang: string }>;
}) => {
  const { lang } = await params;
  const dict = await getDictionary(lang, 'r18-photos');
  return {
    title: dict['r18-photos.title'],
    description: dict['r18-photos.description'],
    keywords: dict['r18-photos.keywords'],
    robots: {
      index: false,
      follow: false,
    },
  };
};

interface R18PhotosLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function R18PhotosLayout({
  children,
  params,
}: R18PhotosLayoutProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang, 'r18-photos');

  return (
    <DictionaryProvider dictionary={dict}>
      <div className="container-wrapper">
        <div className="container py-8">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-medium tracking-tight">
              {dict['r18-photos.title']}
            </h1>
            <p className="text-muted-foreground">
              {dict['r18-photos.description']}
            </p>
          </div>
          {children}
        </div>
      </div>
    </DictionaryProvider>
  );
}
