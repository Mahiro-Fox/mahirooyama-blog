'use client';

import type { Moment } from '@/actions/admin/moments-actions';
import { formatDateWithSecond } from '@/utils/utils';
import { MapPin, Smile } from 'lucide-react';
import { motion } from 'motion/react';

import { BlurFade } from '@/components/shadcn-ui/blur-fade';
import { OptimizedImage } from '@/components/shared/optimized-image';

interface MomentsTimelineProps {
  moments: Moment[];
}

export function MomentsTimeline({ moments }: MomentsTimelineProps) {
  const getRealImageHeight = (moment: Moment) => {
    const scaleRatio = Math.round(
      moment.image?.width ? moment.image.width / 320 : 1
    );
    return Math.round(
      moment.image?.height ? moment.image.height / scaleRatio : 0
    );
  };
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
                    {formatDateWithSecond(moment.createdAt)}
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
                {moment.image && (
                  <div className="relative inline-block w-full">
                    <OptimizedImage
                      src={moment.image.url}
                      width={moment.image.width}
                      height={moment.image.height}
                      fill
                      alt="配图"
                      // 前两个数据中高度最大的那个设置为eager，其他的设置为lazy，优化LCP
                      priority={
                        Math.max(
                          getRealImageHeight(moments[0]),
                          getRealImageHeight(moments[1])
                        ) === getRealImageHeight(moment)
                          ? true
                          : false
                      }
                      className="max-h-48 w-full max-w-xs rounded-lg object-cover"
                    />
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
