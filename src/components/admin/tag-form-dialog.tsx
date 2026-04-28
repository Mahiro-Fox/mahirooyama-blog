'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Input } from '@/components/shadcn-ui/input';
import { Label } from '@/components/shadcn-ui/label';
import { IconPicker } from '@/components/shared/icon-picker';

interface TagFormData {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface TagFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  data: TagFormData;
  onDataChange: (data: TagFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  isEditing?: boolean;
}

export function TagFormDialog({
  open,
  onOpenChange,
  title,
  description,
  data,
  onDataChange,
  onSubmit,
  isSubmitting,
  isEditing = false,
}: TagFormDialogProps) {
  const handleChange = (field: keyof TagFormData, value: string) => {
    onDataChange({ ...data, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-id">标签 ID</Label>
            <Input
              id="tag-id"
              value={data.id}
              onChange={(e) =>
                handleChange(
                  'id',
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                )
              }
              placeholder="如: typescript"
              disabled={isEditing}
              required
            />
            {!isEditing && (
              <p className="text-muted-foreground text-xs">
                只能使用小写字母、数字和连字符
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-name">标签名称</Label>
            <Input
              id="tag-name"
              value={data.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="如: TypeScript"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>图标</Label>
            <IconPicker
              value={data.icon}
              onChange={(value) => handleChange('icon', value)}
              placeholder="选择图标"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-description">描述（可选）</Label>
            <Input
              id="tag-description"
              value={data.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="简短描述这个标签"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
