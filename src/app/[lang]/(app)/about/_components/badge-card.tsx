'use client';

import { motion } from 'framer-motion';
import { BadgeContent } from '@/config/about';
import { useT } from '@/i18n/dictionary-provider';

interface BadgeCardProps {
  content: BadgeContent;
  title?: string;
}

export function BadgeCard({ content, title }: BadgeCardProps) {
  const t = useT();

  return (
    <motion.div
      className="relative flex h-full w-full items-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-500 p-6 shadow-lg"
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex-1">
          {title && (
            <h3 className="mb-2 text-lg font-bold text-white">{t(title)}</h3>
          )}
          <div className="mb-1 text-3xl font-bold text-white">
            {content.type}
          </div>
          <div className="text-xl font-semibold text-white/90">
            {t(content.label)}
          </div>
          {content.description && (
            <p className="mt-2 text-sm text-white/80">
              {t(content.description)}
            </p>
          )}
        </div>

        {/* Animated avatar with breathing effect */}
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-inner backdrop-blur-sm"
          animate={{
            x: [0, 8, 0],
            y: [0, -3, 0],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-white/10"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
          <span className="text-3xl font-bold text-white">
            {content.type.split('-')[0]}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
