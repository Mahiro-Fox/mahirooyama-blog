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
  // 【LCP 优化 1】将随机逻辑直接收敛在 useState 初始化函数中
  // 避免在 useEffect 中二次修改 index 导致浏览器重复请求首屏无关图片
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // 下一张
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  // 上一张
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  // 自动播放逻辑保持不变
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

  // 如果没有数据，直接返回 null 避免报错
  if (!items || items.length === 0) return null;

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

        // 【LCP 优化 2】虚拟化/条件渲染 DOM
        // 计算当前节点是否需要存在于 DOM 中。
        // 为了照顾 2000ms 的淡入淡出过渡动画，我们需要同时保留【当前张】、【上一张】和【下一张】
        const isNext = index === (currentIndex + 1) % items.length;
        const isPrev =
          index === (currentIndex - 1 + items.length) % items.length;

        // 如果既不是当前显示的，也不是即将过渡的，直接不渲染 DOM
        // 从而从根本上阻止浏览器发送非必要图片请求，腾出带宽给 LCP 元素
        if (!isCurrent && !isNext && !isPrev) {
          return null;
        }

        return (
          <div
            key={item.id || index} // 推荐优先使用独一无二的 item.id 提升 React DOM Diff 效率
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
                // 【LCP 优化 3】精准赋予初始显示的图片最高下载优先级
                priority={isCurrent}
              />
            )}
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-black/20" />
          </div>
        );
      })}

      {/* 左右箭头 - 仅在悬停时显示 */}
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

      {/* 指示器 (Dots) */}
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
