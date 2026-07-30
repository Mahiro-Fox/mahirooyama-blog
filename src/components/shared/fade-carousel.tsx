import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/utils';

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
  const hasItems = items && items.length > 0;

  // 1. 状态管理
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);

  // 使用 Ref 存放核心状态，防止定时器闭包过时
  const stateRef = useRef({ items, random, currentIndex, nextIndex });
  useEffect(() => {
    stateRef.current = { items, random, currentIndex, nextIndex };
  }, [items, random, currentIndex, nextIndex]);

  // 2. 辅助函数：生成不重复的随机数
  const getRandomIndex = useCallback((current: number, total: number) => {
    if (total <= 1) return 0;
    let index = Math.floor(Math.random() * total);
    while (index === current) {
      index = Math.floor(Math.random() * total);
    }
    return index;
  }, []);

  // 3. 切换核心逻辑
  const changeSlide = useCallback((targetIndex: number) => {
    setPrevIndex(stateRef.current.currentIndex);
    setCurrentIndex(targetIndex);
    setNextIndex(null); // 切换后重置预加载
  }, []);

  const nextSlide = useCallback(() => {
    const { items: currentItems, currentIndex: cur } = stateRef.current;
    const target = cur === currentItems.length - 1 ? 0 : cur + 1;
    changeSlide(target);
  }, [changeSlide]);

  const prevSlide = () => {
    const { items: currentItems, currentIndex: cur } = stateRef.current;
    const target = cur === 0 ? currentItems.length - 1 : cur - 1;
    changeSlide(target);
  };

  // 4. 单一定时器时间轮询机制（核心修复）
  useEffect(() => {
    if (items.length <= 1) return;

    // 每一帧步进的时间基准（100ms 轮询一次，性能损耗极低，且足够精准）
    const TICK = 100;
    let timeElapsed = 0;
    const prefetchTime = Math.max(autoPlayInterval - 2000, 500); // 提前 2 秒预加载

    const intervalId = setInterval(() => {
      timeElapsed += TICK;

      const {
        random: isRandom,
        items: currentItems,
        currentIndex: cur,
        nextIndex: currentNext,
      } = stateRef.current;

      // 阶段一：到了预加载点，且目前还没有生成 nextIndex，则静默塞入 DOM 开始下载
      if (
        timeElapsed >= prefetchTime &&
        timeElapsed < autoPlayInterval &&
        currentNext === null
      ) {
        if (isRandom) {
          setNextIndex(getRandomIndex(cur, currentItems.length));
        } else {
          setNextIndex((cur + 1) % currentItems.length);
        }
      }

      // 阶段二：满打满算到了切换时间，正式翻页，并重置时间累加器
      if (timeElapsed >= autoPlayInterval) {
        timeElapsed = 0; // 重置计数器
        if (isRandom) {
          // 如果有预加载好的图，直接用；没有则兜底算一个
          const target =
            stateRef.current.nextIndex !== null
              ? stateRef.current.nextIndex
              : getRandomIndex(cur, currentItems.length);
          changeSlide(target);
        } else {
          nextSlide();
        }
      }
    }, TICK);

    return () => clearInterval(intervalId);
  }, [
    items.length,
    autoPlayInterval,
    getRandomIndex,
    nextSlide,
    changeSlide,
    random,
  ]); // 依赖项非常干净，进页面后定时器只创建一次

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
        const isPrev = index === prevIndex;
        const isNextPrefetch = index === nextIndex;

        // 顺序模式下的常规前后判定，防止手动点击时出现断层
        const isSequentialNext =
          !random && index === (currentIndex + 1) % items.length;
        const isSequentialPrev =
          !random && index === (currentIndex - 1 + items.length) % items.length;

        // 【精细化裁剪】只允许当前张、上一张（淡出中）、下一张（预加载中）占用 DOM
        if (
          !isCurrent &&
          !isPrev &&
          !isNextPrefetch &&
          !isSequentialNext &&
          !isSequentialPrev
        ) {
          return null;
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
                priority={index === initialIndex}
              />
            )}
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
              onClick={() => changeSlide(index)}
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
