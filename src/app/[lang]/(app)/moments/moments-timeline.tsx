'use client';

import { MapPin, Smile } from 'lucide-react';
import { m } from 'motion/react';
import { BlurFade } from '@/components/magicui/blur-fade';
import { OptimizedImage } from '@/components/shared/optimized-image';
import { Moment } from '@/lib/moments';
import { formatDateWithHMS } from '@/utils/utils';

interface MomentsTimelineProps {
  moments: Moment[];
}

const getRealImageHeight = (image: Moment['image']) => {
  if (!image) {
    return 0;
  }
  const scaleRatio = Math.round(image?.width ? image.width / 320 : 1);
  return Math.round(image?.height ? image.height / scaleRatio : 0);
};

export function MomentsTimeline({ moments }: MomentsTimelineProps) {
  return (
    <div className="relative">
      {/* 时间轴线 */}
      <div className="bg-border absolute top-0 bottom-0 left-4 w-0.5" />

      {/* 碎碎念列表 */}
      <div className="space-y-8">
        {moments.map((moment, index) => (
          <m.div
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
                    {formatDateWithHMS(moment.createdAt)}
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
                  <div className="relative inline-block">
                    <OptimizedImage
                      // 开发环境下，请求不到图片时，使用fill属性，避免报错
                      fill={process.env.NODE_ENV === 'development'}
                      previewable
                      src={moment.image.url}
                      alt="配图"
                      // 优化LCP
                      priority={
                        Math.max(
                          getRealImageHeight(moments[0].image),
                          moments[1] ? getRealImageHeight(moments[1].image) : 0
                        ) === getRealImageHeight(moment.image)
                          ? true
                          : false
                      }
                      className="max-h-48 max-w-xs rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            </BlurFade>
          </m.div>
        ))}
      </div>
    </div>
  );
}
