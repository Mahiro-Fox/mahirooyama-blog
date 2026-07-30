'use client';

import { motion } from 'framer-motion';
import { PlaneTakeoff } from 'lucide-react';
import { PursuitContent } from '@/config/about';
import { useT } from '@/i18n/dictionary-provider';

interface PursuitCardProps {
  content: PursuitContent;
}

export function PursuitCard({ content }: PursuitCardProps) {
  const t = useT();
  return (
    <motion.div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 via-cyan-300 to-cyan-500 p-6 text-white shadow-lg transition-all hover:shadow-xl"
      whileHover={{ scale: 1.02 }}
    >
      {/* Decorative elements */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl" />

      {/* Greeting with sparkle */}
      <div className="relative z-10 flex items-center gap-2 text-2xl font-semibold">
        <PlaneTakeoff className="h-6 w-6 text-yellow-300" />
        <span>{t(content.text)}</span>
      </div>

      {/* Name and title */}
      <div className="relative z-10">
        <h2 className="text-2xl font-bold tracking-tight">
          {t(content.emphasis || '')}
        </h2>
      </div>
    </motion.div>
  );
}
