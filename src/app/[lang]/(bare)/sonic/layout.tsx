import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sonic Topography',
  description: '沉浸式音频可视化播放器',
};

export default function SonicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}