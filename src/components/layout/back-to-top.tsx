'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/utils/utils';
import { ArrowUp } from 'lucide-react';

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
  return (
    <div
      title="返回顶部"
      className={cn(
        'bg-foreground fixed right-6 bottom-6 z-10 cursor-pointer rounded-full p-2 shadow-lg backdrop-blur-sm transition-opacity duration-300',
        show
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0'
      )}
      aria-label="Back to top"
    >
      <ArrowUp onClick={handleClick} className="text-background h-4 w-4" />
    </div>
  );
}
