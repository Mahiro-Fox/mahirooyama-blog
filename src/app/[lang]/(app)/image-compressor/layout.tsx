import { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const dict = await getDictionary(lang, 'image-compressor');
  return {
    title: dict['image-compressor.title'],
    description: dict['image-compressor.description'],
  };
};

interface ImageCompressorLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function ImageCompressorLayout({
  children,
  params,
}: ImageCompressorLayoutProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang, 'image-compressor');

  return <DictionaryProvider dictionary={dict}>{children}</DictionaryProvider>;
}
