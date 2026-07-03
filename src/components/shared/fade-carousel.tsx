import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/utils/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselItem {
  id: string;
  image: string;
}

interface CarouselProps<T> {
  className?: string;
  initialIndex?: number;
  items: T[];
  random?: boolean;
  autoPlayInterval?: number;
  arrow?: boolean;
  indicator?: boolean;
  itemRender?: (
    item: T,
    state: {
      active: boolean;
      index: number;
    }
  ) => React.ReactNode;
}

export function FadeCarousel<T extends CarouselItem>({
  items,
  className,
  autoPlayInterval = 5000,
  arrow = true,
  indicator = true,
  initialIndex = 0,
  random = false,
  itemRender,
}: CarouselProps<T>) {
  // 核心修复：如果只有 0 或 1 张图，直接不执行后续逻辑，防范边界条件
  const hasItems = items && items.length > 0;

  // 随机初始索引
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!hasItems) return 0;
    if (random && items.length > 1) {
      return Math.floor(Math.random() * items.length);
    }
    return initialIndex;
  });

  // 下一张
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  // 上一张
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  // 自动播放逻辑
  useEffect(() => {
    if (items.length <= 1) return;

    const randomSlide = () => {
      setCurrentIndex((pre) => {
        let randomIndex = Math.floor(Math.random() * items.length);
        while (pre === randomIndex) {
          randomIndex = Math.floor(Math.random() * items.length);
        }
        return randomIndex;
      });
    };

    const timer = setInterval(
      random ? randomSlide : nextSlide,
      autoPlayInterval
    );
    return () => clearInterval(timer);
  }, [random, nextSlide, autoPlayInterval, items.length]);

  if (!hasItems) return null;

  return (
    <div
      className={cn(
        'group relative mx-auto h-[450px] w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl',
        className
      )}
    >
      {/* 图片容器 */}
      {items.map((item, index) => {
        const isCurrent = index === currentIndex;

        // 【修复 LCP 冲突】
        // 如果是随机模式，我们必须让所有 DOM 节点都在线，靠 Next.js Image 自带的 lazy load 协同。
        // 如果是顺序模式，则继续保留原有的前后 1 张虚拟化裁剪，最大化压榨 LCP 性能。
        if (!random) {
          const isNext = index === (currentIndex + 1) % items.length;
          const isPrev =
            index === (currentIndex - 1 + items.length) % items.length;

          if (!isCurrent && !isNext && !isPrev) {
            return null;
          }
        }

        return (
          <div
            key={item.id || index}
            className={`absolute inset-0 transition-opacity duration-2000 ease-in-out ${
              isCurrent ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
          >
            {itemRender ? (
              itemRender(item, { active: isCurrent, index })
            ) : (
              <Image
                src={item.image}
                alt={`Slide ${index}`}
                className="h-full w-full object-cover"
                // 仅对真正意义上的首屏第一张图开启最高优先级（避免频繁变更 priority 导致逻辑混乱）
                priority={index === initialIndex}
              />
            )}
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-black/20" />
          </div>
        );
      })}

      {/* 左右箭头 */}
      {arrow && items.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-5 z-20 hidden -translate-y-1/2 rounded-full bg-white/30 p-2 text-white transition group-hover:block hover:bg-white/50"
          >
            <ChevronLeft size={30} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-5 z-20 hidden -translate-y-1/2 rounded-full bg-white/30 p-2 text-white transition group-hover:block hover:bg-white/50"
          >
            <ChevronRight size={30} />
          </button>
        </>
      )}

      {/* 指示器 */}
      {indicator && items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 space-x-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-3 w-3 rounded-full transition-all ${
                index === currentIndex ? 'w-8 bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
