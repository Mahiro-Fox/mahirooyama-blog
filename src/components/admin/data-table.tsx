'use client';

import { ReactNode, useRef } from 'react';
import { cn } from '@/utils/utils';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { Button } from '@/components/shadcn-ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn-ui/table';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  loadingText?: string;
  emptyText?: string;
  keyExtractor: (item: T) => string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  actions?: {
    edit?: boolean;
    delete?: boolean;
    custom?: (item: T) => ReactNode;
  };
  // 虚拟列表配置
  virtual?: boolean;
  virtualOptions?: {
    estimateSize?: number;
    maxHeight?: string;
    overscan?: number;
  };
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  loadingText = '加载中...',
  emptyText = '暂无数据',
  keyExtractor,
  onEdit,
  onDelete,
  actions,
  virtual = false,
  virtualOptions = {},
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const {
    estimateSize = 50,
    maxHeight = '70vh',
    overscan = 10,
  } = virtualOptions;

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    enabled: virtual,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span className="text-muted-foreground">{loadingText}</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">{emptyText}</div>
    );
  }

  const showActions =
    actions && (actions.edit || actions.delete || actions.custom);

  // 虚拟列表模式
  if (virtual) {
    const virtualItems = virtualizer.getVirtualItems();
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom =
      virtualItems.length > 0
        ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
        : 0;

    return (
      <div className="bg-card overflow-hidden rounded-lg border">
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ maxHeight }}
        >
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={col.width}
                    style={{ textAlign: col.align }}
                  >
                    {col.header}
                  </TableHead>
                ))}
                {showActions && <TableHead className="w-[100px]">操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paddingTop > 0 && (
                <TableRow>
                  <TableCell
                    style={{ height: `${paddingTop}px` }}
                    colSpan={columns.length + (showActions ? 1 : 0)}
                    className="p-0"
                  />
                </TableRow>
              )}
              {virtualItems.map((virtualItem) => {
                const item = data[virtualItem.index];
                return (
                  <TableRow
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'overflow-hidden text-ellipsis whitespace-nowrap',
                          col.width,
                          col.align && `text-${col.align}`
                        )}
                      >
                        {col.render
                          ? col.render(item)
                          : ((item as Record<string, unknown>)[
                              col.key
                            ] as ReactNode)}
                      </TableCell>
                    ))}
                    {showActions && (
                      <TableCell>
                        <div className="flex gap-1">
                          {actions.edit && onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {actions.delete && onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {actions.custom?.(item)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {paddingBottom > 0 && (
                <TableRow>
                  <TableCell
                    style={{ height: `${paddingBottom}px` }}
                    colSpan={columns.length + (showActions ? 1 : 0)}
                    className="p-0"
                  />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // 普通模式
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={col.width}
              style={{ textAlign: col.align }}
            >
              {col.header}
            </TableHead>
          ))}
          {showActions && <TableHead className="w-[100px]">操作</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={keyExtractor(item)}>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={cn(
                  'overflow-hidden text-ellipsis whitespace-nowrap',
                  col.width,
                  col.align && `text-${col.align}`
                )}
              >
                {col.render
                  ? col.render(item)
                  : ((item as Record<string, unknown>)[col.key] as ReactNode)}
              </TableCell>
            ))}
            {showActions && (
              <TableCell>
                <div className="flex gap-1">
                  {actions.edit && onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {actions.delete && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {actions.custom?.(item)}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
