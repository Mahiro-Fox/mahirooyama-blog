'use client';

import Link from 'next/link';
import type { Tag, TagType } from '@/store/tag-store';
import { Loader2, Tag as LucideTag, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/shadcn-ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn-ui/table';
import { BrandIcons } from '@/components/shared/brand-icons';

interface TagsTableProps {
  type: TagType;
  tags: Tag[];
  isLoading: boolean;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
}

export function TagsTable({
  type,
  tags,
  isLoading,
  onEdit,
  onDelete,
}: TagsTableProps) {
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
            BrandIcons[tag.icon as keyof typeof BrandIcons] || LucideTag;
          return (
            <TableRow key={tag.id}>
              <TableCell>
                <IconComponent className="h-4 w-4" />
              </TableCell>
              <TableCell className="font-mono text-xs">
                <Link
                  href={`/tag/${type}/${tag.id}`}
                  className="hover:underline"
                >
                  {tag.id}
                </Link>
              </TableCell>
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
