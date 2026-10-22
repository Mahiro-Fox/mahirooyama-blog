import { ReactNode } from 'react';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const dict = await getDictionary(lang, 'image-obfuscator');
  return {
    title: dict['image-obfuscator.title'],
    description: dict['image-obfuscator.description'],
    keywords: dict['image-obfuscator.keywords'],
  };
};

interface ImageObfuscatorLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function ImageObfuscatorLayout({
  children,
  params,
}: ImageObfuscatorLayoutProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang, 'image-obfuscator');

  return <DictionaryProvider dictionary={dict}>{children}</DictionaryProvider>;
}
