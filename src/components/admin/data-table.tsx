'use client';

import { ReactNode } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
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
}: DataTableProps<T>) {
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
