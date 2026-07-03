import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  const hasItems = items && items.length > 0;

  // 1. 状态管理
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // 专门用于存放提前预测、需要预加载的下一张索引
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  
  // 记录上一张索引，保证淡出动画有 DOM 节点可用
  const [prevIndex, setPrevIndex] = useState<number | null>(null);

  // 用 ref 总是获取最新的 items 长度和随机状态，避免频繁重置定时器
  const stateRef = useRef({ items, random, currentIndex });
  useEffect(() => {
    stateRef.current = { items, random, currentIndex };
  }, [items, random, currentIndex]);

  // 2. 辅助函数：生成不重复的随机数
  const getRandomIndex = useCallback((current: number, total: number) => {
    if (total <= 1) return 0;
    let index = Math.floor(Math.random() * total);
    while (index === current) {
      index = Math.floor(Math.random() * total);
    }
    return index;
  }, []);

  // 3. 切换核心逻辑（统一管理索引变更）
  const changeSlide = useCallback((targetIndex: number) => {
    setPrevIndex(stateRef.current.currentIndex);
    setCurrentIndex(targetIndex);
    setNextIndex(null); // 切换后清空预加载指针
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

  // 4. 自动播放与预加载调度器（核心机制）
  useEffect(() => {
    if (items.length <= 1) return;

    // 计算预加载的时机：在图片即将切换前的 2000ms（刚好对应动画时长）开始拉取网络请求
    const prefetchDelay = Math.max(autoPlayInterval - 2000, 500);

    // 定时器 1：负责在前半段提前计算并向 DOM 塞入下一张图
    const prefetchTimer = setTimeout(() => {
      const { random: isRandom, items: currentItems, currentIndex: cur } = stateRef.current;
      if (isRandom) {
        setNextIndex(getRandomIndex(cur, currentItems.length));
      } else {
        setNextIndex((cur + 1) % currentItems.length);
      }
    }, prefetchDelay);

    // 定时器 2：负责到达间隔时间后，正式执行渐变切换
    const flipTimer = setTimeout(() => {
      const { random: isRandom, items: currentItems, currentIndex: cur } = stateRef.current;
      if (isRandom) {
        // 如果因为某些原因 nextIndex 没生成，则临时兜底计算
        changeSlide(nextIndex !== null ? nextIndex : getRandomIndex(cur, currentItems.length));
      } else {
        nextSlide();
      }
    }, autoPlayInterval);

    return () => {
      clearTimeout(prefetchTimer);
      clearTimeout(flipTimer);
    };
  }, [currentIndex, random, autoPlayInterval, items.length, nextIndex, getRandomIndex, nextSlide, changeSlide]);


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

        // 如果是顺序播放，依然保留“当前、前一张、常规下一张”做防误伤兜底
        const isSequentialNext = !random && index === (currentIndex + 1) % items.length;
        const isSequentialPrev = !random && index === (currentIndex - 1 + items.length) % items.length;

        // 【方案二精细化裁剪】
        // 只有当前显示的、刚刚退场的、以及被我们“精准预测并提前预加载”的图片，才允许进入 DOM
        if (!isCurrent && !isPrev && !isNextPrefetch && !isSequentialNext && !isSequentialPrev) {
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
                // 仅对首屏第一张图保持最高优先级
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