// import { Link } from '@/components/shared/link';
// import { FileText, Folder, ImageIcon } from 'lucide-react';

import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

// import { navRoutesConfig } from '@/lib/config';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@/components/shadcn-ui/card';

// export const metadata = {
//   title: '内容浏览',
//   description: '浏览博客文章和画廊图片',
// };

export default async function PageLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang, 'page');

  return (
    <DictionaryProvider dictionary={dictionary}>{children}</DictionaryProvider>
  );
}
