'use client';

import { motion } from 'framer-motion';
import { MarqueeContent } from '@/config/about';
import { useT } from '@/i18n/dictionary-provider';

interface MarqueeCardProps {
  content: MarqueeContent;
}

export function MarqueeCard({ content }: MarqueeCardProps) {
  const t = useT();
  const repeatCount = content.repeat || 3;
  return (
    <motion.div
      className="relative flex h-full w-full items-center overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 shadow-lg"
      whileHover={{ scale: 1.01 }}
    >
      <div className="flex">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: [0, -1000],
          }}
          transition={{
            x: {
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'loop',
              duration: 25,
              ease: 'linear',
            },
          }}
        >
          {Array.from({ length: repeatCount }).map((_, i) => (
            <span key={i} className="mr-8 text-4xl font-bold text-white">
              {t(content.text)}
            </span>
          ))}
        </motion.div>
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: [0, -1000],
          }}
          transition={{
            x: {
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'loop',
              duration: 25,
              ease: 'linear',
            },
          }}
        >
          {Array.from({ length: repeatCount }).map((_, i) => (
            <span key={i} className="mr-8 text-4xl font-bold text-white">
              {t(content.text)}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
