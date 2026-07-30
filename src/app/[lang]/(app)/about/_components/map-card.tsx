'use client';

import { motion } from 'framer-motion';
import { Heart, MapPin } from 'lucide-react';
import { MapContent } from '@/config/about';

interface MapCardProps {
  content: MapContent;
}

export function MapCard({ content }: MapCardProps) {
  return (
    <motion.div
      className="relative flex h-full w-full items-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 shadow-lg"
      whileHover={{ scale: 1.02 }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-purple-500/20 blur-2xl" />

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
            我现在居住在{' '}
            <span className="font-bold">
              {content.country}，{content.city}
            </span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
