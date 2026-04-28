'use client';

import { Loader2, Pencil, Trash2, Tag } from 'lucide-react';
import { BrandIcons } from '@/components/shared/brand-icons';
import { Button } from '@/components/shadcn-ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn-ui/table';
import type { Tag as TagType } from '@/lib/tag-store';

interface TagsTableProps {
  tags: TagType[];
  isLoading: boolean;
  onEdit: (tag: TagType) => void;
  onDelete: (tag: TagType) => void;
}

export function TagsTable({ tags, isLoading, onEdit, onDelete }: TagsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        暂无标签，点击上方按钮创建
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">图标</TableHead>
          <TableHead>ID</TableHead>
          <TableHead>名称</TableHead>
          <TableHead>描述</TableHead>
          <TableHead className="w-[100px]">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tags.map((tag) => {
          const IconComponent =
            BrandIcons[tag.icon as keyof typeof BrandIcons] || Tag;
          return (
            <TableRow key={tag.id}>
              <TableCell>
                <IconComponent className="h-4 w-4" />
              </TableCell>
              <TableCell className="font-mono text-xs">{tag.id}</TableCell>
              <TableCell className="font-medium">{tag.name}</TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate">
                {tag.description || '-'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(tag)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(tag)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
