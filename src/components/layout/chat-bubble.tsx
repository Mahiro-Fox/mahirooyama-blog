'use client';

import { Link } from '@/components/shared/link';

export function ChatBubble() {
  return (
    <Link
      href="/chat"
      className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform hover:scale-105"
      aria-label="打开聊天"
    >
      💬
    </Link>
  );
}
