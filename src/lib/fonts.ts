import {
  Noto_Sans_SC as FontChinese,
  Geist_Mono as FontMono,
  Geist as FontSans,
  Inter,
} from 'next/font/google';
import { cn } from '@/utils/utils';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = FontMono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400'],
});

const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fontChinese = FontChinese({
  subsets: ['latin'],
  variable: '--font-chinese',
  weight: ['400', '500', '700'],
});

export const fontVariables = cn(
  fontSans.variable,
  fontMono.variable,
  fontInter.variable,
  fontChinese.variable
);
