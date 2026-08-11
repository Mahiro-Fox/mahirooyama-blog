'use client';

import { MessageSquare } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Guestbook } from '@/lib/guestbook';
import { formatDateWithHMS } from '@/utils/utils';

interface GuestbookWallProps {
  entries: Guestbook[];
}

// 生成随机旋转角度
const getRandomRotation = () => {
  return Math.random() * 6 - 3; // -3度到+3度
};

export function GuestbookWall({ entries }: GuestbookWallProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence>
        {entries.map((entry, index) => (
          <m.div
            key={entry.id}
            initial={{ opacity: 0, y: -50, rotate: 0 }}
            animate={{
              opacity: 1,
              y: 0,
              rotate: getRandomRotation(),
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              type: 'spring',
              bounce: 0.5,
            }}
            className="relative rounded-xl"
            style={{
              backgroundColor: entry.bgColor,
              boxShadow: '2px 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {/* 便利贴 */}
            <div className="flex min-h-[200px] flex-col p-6 text-gray-800">
              {/* 昵称和时间 */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold">{entry.nickname}</span>
                <span className="text-xs opacity-70">
                  {formatDateWithHMS(entry.createdAt)}
                </span>
              </div>

              {/* 留言内容 */}
              <p className="flex-1 text-sm leading-relaxed">{entry.content}</p>

              {/* 联系方式 */}
              {/* {entry.contact && (
                  <div className="mt-3 border-t border-black/10 pt-3">
                    <a
                      href={entry.contact}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline opacity-70 hover:opacity-100"
                    >
                      {entry.contact}
                    </a>
                  </div>
                )} */}

              {/* 博主回复 */}
              {entry.replyContent && (
                <div className="mt-4 rounded border-l-2 border-black/30 bg-white/50 p-3">
                  <div className="mb-1 flex items-center gap-1 text-xs font-bold">
                    <MessageSquare className="h-3 w-3" />
                    博主回复
                  </div>
                  <p className="text-xs">{entry.replyContent}</p>
                </div>
              )}
            </div>

            {/* 胶带效果 */}
            <div className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 rotate-[-2deg] bg-yellow-100/80 shadow-sm" />
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
