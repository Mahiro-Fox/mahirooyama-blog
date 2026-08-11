'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type Props = {
  className?: string;
  style?: React.CSSProperties;
  /**
   * @description 前置图片
   */
  before: string;
  /**
   * @description 后置图片
   */
  after: string;
  /**
   * @description 初始值，默认 50
   */
  initialValue?: number;
  /**
   * @description 是否显示图标，默认 true
   */
  withIcon?: boolean;
  /**
   * @description 是否可交互，默认 true
   */
  interactive?: boolean;
  /**
   * @description 图片宽度
   */
  width?: number;
  /**
   * @description 图片高度
   */
  height?: number;
};

const ImageConvert: React.FC<Props> = ({
  width,
  height,
  className,
  style,
  before,
  after,
  initialValue = 50,
  withIcon = true,
  interactive = true,
}) => {
  const [leftValue, setLeftValue] = useState(initialValue);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 捕获当前容器节点：effect 重跑时容器可能已换节点，清理应只针对本次捕获的节点
    const container = containerRef.current;
    const handleMouseMove = (e: MouseEvent) => {
      // 获取容器相对于视口的位置
      const rect = container?.getBoundingClientRect();
      if (rect) {
        // 计算鼠标相对于容器左侧的位置
        const x = e.clientX - rect.left;
        // 计算百分比
        const width = rect.width;
        const percentage = (x / width) * 100;
        setLeftValue(percentage);
      }
    };
    if (interactive && container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [interactive]);
  return (
    <div
      className={`relative overflow-hidden ${className ? className : ''}`}
      style={style}
      ref={containerRef}
    >
      <div className="flex gap-4">
        <Image
          className="before user-drag-none absolute select-none"
          src={before}
          width={width}
          height={height}
          alt="before"
        />
        <Image
          style={{ clipPath: `inset(0 0 0 ${leftValue}%)` }}
          className="after user-drag-none select-none"
          width={width}
          height={height}
          src={after}
          alt="after"
        />
      </div>
      <p
        className="follow-line absolute top-0 bottom-0 h-full w-[2px] bg-white"
        style={{ left: `${leftValue}%` }}
      >
        {withIcon && (
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            width="38"
            height="38"
            viewBox="0 0 38 38"
          >
            <g transform="matrix(-1 0 0 1 38 0)" fill="none" fillRule="evenodd">
              <circle fill="#FFF" cx="19" cy="19" r="19"></circle>
              <g fill="#1A1B1C" fillRule="nonzero">
                <path d="M23.394 14.83a.776.776 0 01.551.224l3.881 3.881a.776.776 0 010 1.095l-3.88 3.88a.776.776 0 01-1.095-1.094l3.33-3.33-3.33-3.33a.776.776 0 01.543-1.327zM13.926 14.83a.776.776 0 00-.551.224l-3.881 3.881a.776.776 0 000 1.095l3.881 3.88a.776.776 0 001.095-1.094l-3.33-3.33 3.33-3.33a.776.776 0 00-.544-1.327z"></path>
              </g>
            </g>
          </svg>
        )}
      </p>
    </div>
  );
};

export default ImageConvert;
