'use client';

import { useTheme } from 'next-themes';

import { Particles } from '@/components/shadcn-ui/particles';

export function ThemeParticle() {
  const { resolvedTheme } = useTheme();
  return (
    <Particles
      className="absolute inset-0 z-0"
      color={resolvedTheme === 'dark' ? '#ffffff' : '#000000'}
    />
  );
}
