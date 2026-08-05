'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/utils/utils';

export function BackToTop() {
  const [show, setShow] = useState(false);
  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };
  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return show ? (
    <div
      title="返回顶部"
      className={cn(
        'text-foreground cursor-pointer rounded-full p-2 shadow-lg outline backdrop-blur-sm transition-opacity duration-300 hover:scale-105'
      )}
      aria-label="Back to top"
    >
      <ArrowUp onClick={handleClick} className="h-4 w-4" />
    </div>
  ) : null;
}
