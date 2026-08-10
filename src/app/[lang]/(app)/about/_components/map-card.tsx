'use client';

import { motion } from 'framer-motion';
import { Heart, MapPin } from 'lucide-react';
import { MapContent } from '@/config/about';
import { useT } from '@/i18n/dictionary-provider';

interface MapCardProps {
  content: MapContent;
}

export function MapCard({ content }: MapCardProps) {
  const t = useT();
  return (
    <motion.div
      className="relative flex h-full w-full items-center overflow-hidden rounded-2xl shadow-lg"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in oklch, var(--primary) 75%, white 25%), color-mix(in oklch, var(--primary) 65%, black 35%))',
      }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />

      {/* Map pin with ripple effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/30 blur-md" />
            <MapPin className="relative h-14 w-14 text-white drop-shadow-lg" />
          </div>
        </motion.div>

        {/* Ripple rings */}
        <motion.div
          className="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30"
          animate={{
            scale: [1, 1.5],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeOut',
          }}
        />
      </div>

      {/* Location info with glassmorphism */}
      <motion.div
        className="absolute right-4 bottom-4 left-4 rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur-md"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 fill-red-400 text-red-400" />
          <p className="text-sm font-medium text-white">
            {t('about.now_living_in')}{' '}
            <span className="font-bold">
              {t(content.country)}，{t(content.city)}
            </span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
