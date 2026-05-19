'use client';

import { useEffect, useState } from 'react';
import {
  getPublicGuestbookEntries,
  submitGuestbookEntry,
  type GuestbookEntry,
} from '@/actions/admin/guestbook-actions';
import { formatDate } from '@/utils/utils';
import { MessageSquare, Send, Sticker } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
const COLOR_OPTIONS = [
  { name: '淡粉', value: '#FADADD' },
  { name: '淡蓝', value: '#AEC6CF' },
  { name: '淡绿', value: '#77DD77' },
  { name: '淡黄', value: '#FDFD96' },
  { name: '淡紫', value: '#B39EB5' },
  { name: '淡橙', value: '#FFB347' },
];

interface GuestbookWallProps {
  entries: GuestbookEntry[];
}

export function GuestbookWall({ entries }: GuestbookWallProps) {
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

  // 生成随机旋转角度
  const getRandomRotation = () => {
    return Math.random() * 6 - 3; // -3度到+3度
  };

  return (
    <>
      {/* 提交按钮 */}
      <div className="mb-8 flex justify-center">
        <Button
          size="lg"
          className="gap-2"
          onClick={() => setIsDialogOpen(true)}
        >
          <Sticker className="h-5 w-5" />
          写一条！
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>留下你的足迹</DialogTitle>
              <DialogDescription>
                选择喜欢的颜色，写下你的留言
              </DialogDescription>
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
                <label className="mb-2 block text-sm font-medium">
                  留言内容
                </label>
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
          </DialogContent>
        </Dialog>
      </div>

      {/* 留言墙 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -50, rotate: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: getRandomRotation(),
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                type: 'spring',
                bounce: 0.5,
              }}
              className="relative"
              style={{
                backgroundColor: entry.bgColor,
                boxShadow: '2px 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {/* 便利贴 */}
              <div className="flex min-h-[200px] flex-col p-6">
                {/* 昵称和时间 */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold">{entry.nickname}</span>
                  <span className="text-xs opacity-70">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>

                {/* 留言内容 */}
                <p className="flex-1 text-sm leading-relaxed">
                  {entry.content}
                </p>

                {/* 联系方式 */}
                {/* {entry.contact && (
                  <div className="mt-3 border-t border-black/10 pt-3">
                    <a
                      href={entry.contact}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline opacity-70 hover:opacity-100"
                    >
                      {entry.contact}
                    </a>
                  </div>
                )} */}

                {/* 博主回复 */}
                {entry.replyContent && (
                  <div className="mt-4 rounded border-l-2 border-black/30 bg-white/50 p-3">
                    <div className="mb-1 flex items-center gap-1 text-xs font-bold">
                      <MessageSquare className="h-3 w-3" />
                      博主回复
                    </div>
                    <p className="text-xs">{entry.replyContent}</p>
                  </div>
                )}
              </div>

              {/* 胶带效果 */}
              <div className="absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 rotate-[-2deg] bg-yellow-100/80 shadow-sm" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
