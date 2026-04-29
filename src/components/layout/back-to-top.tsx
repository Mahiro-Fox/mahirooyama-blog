'use client';

import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };
  return (
    <div
      className="bg-foreground fixed right-10 bottom-10 z-50 cursor-pointer rounded-full p-2 shadow-lg backdrop-blur-sm"
      aria-label="Back to top"
    >
      <ArrowUp onClick={handleClick} className="text-background" />
    </div>
  );
}
