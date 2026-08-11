'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/utils';

interface MasonryProps<T> {
  items: T[];
  columns?: number;
  gutter?: number;
  minColumns?: number;
  minItemWidth?: number;
  className?: string;
  itemRender: (props: { data: T; index: number }) => React.ReactNode;
}
const Masonry = <T extends { [key: string]: any }>({
  items = [],
  columns = 4,
  gutter = 16,
  minColumns = 1,
  minItemWidth = 220,
  className,
  itemRender,
}: MasonryProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentColumns, setCurrentColumns] = useState(columns);

  // 1. 动态调整列数：修正逻辑锁死问题
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      // 计算理想列数
      let cols = Math.floor(width / minItemWidth);
      // 限制在 [minColumns, columns] 范围内
      cols = Math.max(minColumns, Math.min(columns, cols || 1));

      // 只有当列数真的改变时才触发更新
      setCurrentColumns((prev) => (prev !== cols ? cols : prev));
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [columns, minColumns, minItemWidth]); // 移除对 currentColumns 的依赖

  // 2. 瀑布流分列计算
  const columnData = useMemo(() => {
    const result: T[][] = Array.from({ length: currentColumns }, () => []);
    const columnHeights = new Array(currentColumns).fill(0);

    // 获取当前容器的大致宽度，用于更准地预估高度
    const containerWidth = containerRef.current?.offsetWidth || 1200;
    const approxColWidth =
      (containerWidth - (currentColumns - 1) * gutter) / currentColumns;

    items.forEach((item) => {
      // 贪心算法：找到当前最短的列
      let minHeightIndex = 0;
      for (let i = 1; i < currentColumns; i++) {
        if (columnHeights[i] < columnHeights[minHeightIndex]) {
          minHeightIndex = i;
        }
      }

      result[minHeightIndex].push(item);

      // 高度计算逻辑：(1 / 宽高比) * 实际渲染宽度
      const itemRatio = item.ratio || 1;
      // 如果 item 包含非图片高度（如文字），建议在这里加一个固定偏移量，例如 + 60
      const estimatedHeight = (1 / itemRatio) * approxColWidth;

      columnHeights[minHeightIndex] += estimatedHeight + gutter;
    });

    return result;
  }, [items, currentColumns, gutter]);

  return (
    <div
      className={cn(`flex w-full`, className)}
      style={{ gap: `${gutter}px` }}
      ref={containerRef}
    >
      {columnData.map((colItems, colIndex) => (
        <div
          key={`col-${colIndex}`}
          className="flex flex-1 flex-col"
          style={{ gap: `${gutter}px` }}
        >
          {colItems.map((item, index) => (
            <div
              key={item.template_id || item.src}
              className="w-full"
            >
              {itemRender({ data: item, index })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Masonry;
