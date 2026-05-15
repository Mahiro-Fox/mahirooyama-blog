import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/utils/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // 也可以换成普通的文字箭头

interface CarouselProps {
  className?: string;
  images: string[];
  random?: boolean;
  autoPlayInterval?: number;
  arrow?: boolean;
  indicator?: boolean;
  itemRender?: (image: string, index: number) => React.ReactNode;
}

export const FadeCarousel: React.FC<CarouselProps> = ({
  className,
  images,
  random = true,
  itemRender,
  autoPlayInterval = 5000,
  arrow = true,
  indicator = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(Math.floor(Math.random() * images.length));
  }, [images.length]);

  // 下一张
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // 上一张
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const randomSlide =  () => {
    setCurrentIndex(pre =>{
      let randomIndex = Math.floor(Math.random() * images.length);
      while (pre === randomIndex) {
        randomIndex = Math.floor(Math.random() * images.length);
      }
      return randomIndex
    });
  };

  // 自动播放
  useEffect(() => {
    const timer = setInterval(random ? randomSlide : nextSlide, autoPlayInterval);
    return () => clearInterval(timer);
  }, [random, nextSlide, randomSlide, autoPlayInterval]);

  return (
    <div
      className={cn(
        'group relative mx-auto h-[450px] w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl',
        className
      )}
    >
      {/* 图片容器 */}
      {images.map((image, index) =>
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-2000 ease-in-out ${
              index === currentIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
          >
            {
              itemRender ? itemRender(image,index) :
              <img
                src={image}
                alt={`Slide ${index}`}
                className="h-full w-full object-cover"
              />
            }
            {/* 渐变遮罩 (可选，增加文字可读性) */}
            <div className="absolute inset-0 bg-black/20" />
          </div>
        
      )}

      {/* 左右箭头 - 仅在悬停时显示 */}
      {arrow && (
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
      {indicator && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 space-x-2">
          {images.map((_, index) => (
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
};
