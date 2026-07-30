'use client';

import { motion, useInView, Variants } from 'framer-motion';
import { useRef } from 'react';

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  inView?: boolean;
  inViewMargin?: `${number}px` | `${number}%`;
  blur?: string;
}

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = 'down',
  inView = false,
  inViewMargin = '-50px',
  blur = '6px',
}: BlurFadeProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: inViewMargin });

  const getOffset = () => {
    switch (direction) {
      case 'up':
        return { y: offset };
      case 'down':
        return { y: -offset };
      case 'left':
        return { x: offset };
      case 'right':
        return { x: -offset };
      default:
        return { y: offset };
    }
  };

  const defaultVariants: Variants = {
    hidden: {
      opacity: 0,
      filter: `blur(${blur})`,
      ...getOffset(),
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      x: 0,
    },
  };

  const combinedVariants = variant || defaultVariants;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView || !inView ? 'visible' : 'hidden'}
      variants={combinedVariants}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
