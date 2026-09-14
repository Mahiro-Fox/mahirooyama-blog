'use client';

import { Bot } from 'lucide-react';
import { Link } from '@/components/shared/link';

export function ChatBubble() {
  return (
    <Link
      href="/chat"
      className="text-foreground flex h-8 w-8 items-center justify-center rounded-full shadow-lg outline transition-transform hover:scale-105"
      aria-label="打开聊天"
    >
      <Bot className="h-4 w-4" />
    </Link>
  );
}
