'use client';

import { Bug, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { submitBugReport } from '@/actions/admin/bug-actions';
import { Button } from '@/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Field, FieldLabel } from '@/components/shadcn-ui/field';
import { Input } from '@/components/shadcn-ui/input';
import { trackEvent } from '@/utils/tracker';

export function BugReportTrigger() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('bug_report_submit');
    if (!content.trim()) {
      toast.error('请输入 BUG 描述');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitBugReport({
        content: content.trim(),
        contact: contact.trim(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });

      if (res.success) {
        toast.success('感谢反馈！mahiro会尽快处理的喵！');
        setOpen(false);
        setContent('');
        setContact('');
      } else {
        toast.error(res.error || '提交失败');
      }
    } catch {
      toast.error('网络错误，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClick = () => {
    trackEvent('bug_report_click');
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 cursor-pointer rounded-full p-2 shadow-lg transition-transform hover:scale-110"
        title="提交 BUG"
        onClick={handleClick}
      >
        <Bug className="h-4 w-4" />
        <span className="sr-only">提交 BUG</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bug className="text-destructive h-5 w-5" />
                提交 BUG 报告
              </DialogTitle>
              <DialogDescription>
                发现网站 BUG？请在下方描述问题，mahiro会尽快修复的喵！
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel>
                  问题描述 <span className="text-destructive">*</span>
                </FieldLabel>
                <textarea
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="请详细描述您遇到的问题..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>联系方式 (可选)</FieldLabel>
                <Input
                  placeholder="邮箱或社交账号，方便我们联系您"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  disabled={isSubmitting}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? '提交中...' : '提交报告'}
                {!isSubmitting && <Send className="ml-2 h-4 w-4" />}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
