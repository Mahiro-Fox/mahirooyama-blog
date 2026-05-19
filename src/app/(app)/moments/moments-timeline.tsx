'use client';

import type { Moment } from '@/actions/admin/moments-actions';
import { formatDate } from '@/utils/utils';
import { MapPin, Smile } from 'lucide-react';
import { motion } from 'motion/react';

import { BlurFade } from '@/components/shadcn-ui/blur-fade';

interface MomentsTimelineProps {
  moments: Moment[];
}

export function MomentsTimeline({ moments }: MomentsTimelineProps) {
  return (
    <div className="relative">
      {/* 时间轴线 */}
      <div className="bg-border absolute top-0 bottom-0 left-4 w-0.5" />

      {/* 碎碎念列表 */}
      <div className="space-y-8">
        {moments.map((moment, index) => (
          <motion.div
            key={moment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative pl-12"
          >
            {/* 时间点 */}
            <div className="bg-primary border-background absolute left-2 h-5 w-5 rounded-full border-4" />

            {/* 卡片 */}
            <BlurFade delay={index * 0.1}>
              <div className="bg-card rounded-lg border p-6 shadow-sm transition-shadow hover:shadow-md">
                {/* 时间和标签 */}
                <div className="text-muted-foreground mb-3 flex items-center gap-3 text-sm">
                  <span className="text-foreground font-medium">
                    {formatDate(moment.createdAt)}
                  </span>
                  {moment.moodEmoji && (
                    <span className="flex items-center gap-1">
                      <Smile className="h-3 w-3" />
                      {moment.moodEmoji}
                    </span>
                  )}
                  {moment.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {moment.location}
                    </span>
                  )}
                </div>

                {/* 内容 */}
                <p className="mb-4 text-base">{moment.content}</p>

                {/* 配图 */}
                {moment.imageUrl && (
                  <div className="group relative cursor-pointer overflow-hidden rounded-lg">
                    <img
                      src={moment.imageUrl}
                      alt="配图"
                      className="w-full object-cover transition-transform group-hover:scale-105"
                      onClick={() => {
                        // 简单的灯箱效果，可以后续优化
                        window.open(moment.imageUrl, '_blank');
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/10 group-hover:opacity-100">
                      <span className="text-sm font-medium text-white">
                        点击放大
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </BlurFade>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
