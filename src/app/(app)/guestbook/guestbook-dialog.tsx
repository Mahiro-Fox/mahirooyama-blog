'use client';

import { useState } from 'react';
import { submitGuestbookEntry } from '@/actions/admin/guestbook-actions';
import { Send, Sticker, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Input } from '@/components/shadcn-ui/input';

// 莫兰迪色系颜色选项
import { COLOR_OPTIONS } from '@/constant';

export function GuestbookWallDialog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单状态
  const [nickname, setNickname] = useState('');
  const [bgColor, setBgColor] = useState(COLOR_OPTIONS[0].value);
  const [contact, setContact] = useState('');
  const [content, setContent] = useState('');
  // 提交留言
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) {
      toast.error('请填写昵称和留言内容');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitGuestbookEntry({
        nickname: nickname.trim(),
        bgColor,
        contact: contact.trim() || undefined,
        content: content.trim(),
      });

      if (result.success) {
        toast.success('留言提交成功，等待审核后显示');
        setIsDialogOpen(false);
        // 重置表单
        setNickname('');
        setBgColor(COLOR_OPTIONS[0].value);
        setContact('');
        setContent('');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('提交失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="mb-8 flex justify-center">
      <Button size="lg" className="gap-2" onClick={() => setIsDialogOpen(true)}>
        <Sticker className="h-5 w-5" />
        写一条！
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="relative m-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>留下你的足迹</DialogTitle>
            <DialogDescription>选择喜欢的颜色，写下你的留言</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">昵称</label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称"
                maxLength={20}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                便利贴颜色
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setBgColor(color.value)}
                    className={`h-10 w-10 rounded-lg border-2 transition-transform hover:scale-110 ${
                      bgColor === color.value
                        ? 'border-primary scale-110 shadow-md'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                联系方式（可选）
              </label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="网址或联系方式（不会展示在公开页面喵~）"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">留言内容</label>
              <textarea
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setContent(e.target.value)
                }
                placeholder="写下你的想法...（最多300字）"
                maxLength={300}
                rows={4}
                className="focus:ring-primary w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <div className="text-muted-foreground mt-1 text-right text-xs">
                {content.length}/300
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '提交中...' : '提交留言'}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <X
            className="absolute top-4 right-4 cursor-pointer"
            onClick={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
