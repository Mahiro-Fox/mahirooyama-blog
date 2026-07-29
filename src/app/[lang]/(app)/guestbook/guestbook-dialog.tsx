'use client';

import { useState } from 'react';
import { submitGuestbook } from '@/actions/admin/guestbook-actions';
import { COLOR_OPTIONS } from '@/config';
import { useT } from '@/i18n/dictionary-provider';
import { trackEvent } from '@/utils/tracker';
import { isEmail } from '@/utils/utils';
// 莫兰迪色系颜色选项
import { CheckIcon, Send, Sticker, X, XIcon } from 'lucide-react';
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
import { Toggle } from '@/components/shadcn-ui/toggle';

export function GuestbookWallDialog() {
  const t = useT();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单状态
  const [nickname, setNickname] = useState('');
  const [bgColor, setBgColor] = useState(COLOR_OPTIONS[0].value);
  const [contact, setContact] = useState('');
  const [content, setContent] = useState('');
  const [isEmailNotificationEnabled, setIsEmailNotificationEnabled] =
    useState(false);
  // 提交留言
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) {
      toast.error(t('guestbook.form.validate.required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitGuestbook({
        nickname: nickname.trim(),
        bgColor,
        contact: contact.trim() || undefined,
        content: content.trim(),
        isEmailNotificationEnabled,
      });

      if (result.success) {
        toast.success(t('guestbook.form.submit.success'));
        trackEvent('submit_guestbook_success', { nickname });
        setIsDialogOpen(false);
        // 重置表单
        setNickname('');
        setBgColor(COLOR_OPTIONS[0].value);
        setContact('');
        setContent('');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t('guestbook.form.submit.error'));
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="mb-8 flex justify-center">
      <Button
        size="lg"
        className="gap-2"
        onClick={() => {
          setIsDialogOpen(true);
          trackEvent('open_guestbook_dialog');
        }}
      >
        <Sticker className="h-5 w-5" />
        {t('guestbook.button.write')}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="relative m-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('guestbook.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('guestbook.dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('guestbook.form.label.nickname')}
              </label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t('guestbook.form.placeholder.nickname')}
                maxLength={20}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('guestbook.form.label.bg_color')}
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setBgColor(color.value)}
                    className={`h-10 w-10 rounded-lg border-2 transition-transform hover:scale-110 ${
                      bgColor === color.value
                        ? 'scale-110 border-cyan-400 shadow-md'
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
                {t('guestbook.form.label.contact')}
              </label>
              <div className="flex flex-col gap-2">
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t('guestbook.form.placeholder.contact')}
                />
                <p className="text-muted-foreground text-xs">
                  {t('guestbook.form.tip.contact')}
                </p>
                {isEmail(contact) && (
                  <Toggle
                    onClick={() =>
                      setIsEmailNotificationEnabled(!isEmailNotificationEnabled)
                    }
                    className="self-start"
                    aria-label="email receive notification"
                    variant="outline"
                    size="sm"
                  >
                    <>
                      {isEmailNotificationEnabled ? (
                        <CheckIcon color="green" />
                      ) : (
                        <XIcon color="red" />
                      )}
                      <span
                        className={
                          isEmailNotificationEnabled ? 'text-green-500' : ''
                        }
                      >
                        {t('guestbook.form.label.email_notification')}
                      </span>
                    </>
                  </Toggle>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t('guestbook.form.label.content')}
              </label>
              <textarea
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setContent(e.target.value)
                }
                placeholder={t('guestbook.form.placeholder.content')}
                maxLength={300}
                rows={4}
                className="focus:ring-primary w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <div className="text-muted-foreground mt-1 text-right text-xs">
                {t('guestbook.form.char_count').replace(
                  '{count}',
                  String(content.length)
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? t('guestbook.form.submitting')
                : t('guestbook.form.submit')}
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
