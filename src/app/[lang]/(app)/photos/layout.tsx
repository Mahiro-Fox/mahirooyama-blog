import { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const photoDictionary = await getDictionary(lang, 'photos');
  return {
    title: photoDictionary['photos.title'],
    description: photoDictionary['photos.description'],
    keywords: photoDictionary['photos.keywords'],
  };
};
interface PhotosLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function PhotosLayout({
  children,
  params,
}: PhotosLayoutProps) {
  const { lang } = await params;
  const photoDictionary = await getDictionary(lang, 'photos');
  return (
    <DictionaryProvider dictionary={photoDictionary}>
      <div className="container-wrapper">
        <div className="container py-8">
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-medium tracking-tight">
              {photoDictionary['photos.title']}
            </h1>
            <p className="text-muted-foreground">
              {photoDictionary['photos.description']}
            </p>
          </div>
          {children}
        </div>
      </div>
    </DictionaryProvider>
  );
}
