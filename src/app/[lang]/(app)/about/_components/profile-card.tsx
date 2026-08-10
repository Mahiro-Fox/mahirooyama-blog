'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ProfileContent } from '@/config/about';
import { useT } from '@/i18n/dictionary-provider';

interface ProfileCardProps {
  content: ProfileContent;
}

export function ProfileCard({ content }: ProfileCardProps) {
  const t = useT();
  return (
    <motion.div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all hover:shadow-xl"
      style={{
        background:
          'linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 70%, black 30%))',
      }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Decorative elements */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />

      {/* Greeting with sparkle */}
      <div className="relative z-10 flex items-center gap-2 text-2xl font-semibold">
        <Sparkles className="h-6 w-6 text-yellow-300" />
        <span>{t(content.greeting)}</span>
      </div>

      {/* Name and title */}
      <div className="relative z-10">
        <h2 className="text-4xl font-bold tracking-tight">{t(content.name)}</h2>
        <p className="mt-2 text-lg text-white/80">{t(content.title)}</p>
      </div>

      {/* Animated background pattern */}
      <motion.div
        className="absolute -right-20 -bottom-20 h-60 w-60 rounded-full border-4 border-white/5"
        // animate={{
        //   rotate: [0, 360],
        // }}
        // transition={{
        //   duration: 20,
        //   repeat: Number.POSITIVE_INFINITY,
        //   ease: 'linear',
        // }}
      />
    </motion.div>
  );
}
