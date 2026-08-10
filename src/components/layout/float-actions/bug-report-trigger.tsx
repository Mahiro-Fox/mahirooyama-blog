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
import { Input } from '@/components/shadcn-ui/input';
import { Field, FieldLabel } from '@/components/shared/field';
import { useT } from '@/i18n/dictionary-provider';
import { trackEvent } from '@/utils/tracker';

export function BugReportTrigger() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('bug_report_submit');
    if (!content.trim()) {
      toast.error(t('bug_report.error_empty'));
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
        toast.success(t('bug_report.success'));
        setOpen(false);
        setContent('');
        setContact('');
      } else {
        toast.error(res.error || t('bug_report.error_failed'));
      }
    } catch {
      toast.error(t('bug_report.error_network'));
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
        title={t('bug_report.button_title')}
        onClick={handleClick}
      >
        <Bug className="h-4 w-4" />
        <span className="sr-only">{t('bug_report.button_title')}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bug className="text-destructive h-5 w-5" />
                {t('bug_report.dialog_title')}
              </DialogTitle>
              <DialogDescription>
                {t('bug_report.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Field>
                <FieldLabel>
                  {t('bug_report.content_label')}{' '}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <textarea
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t('bug_report.content_placeholder')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>{t('bug_report.contact_label')}</FieldLabel>
                <Input
                  placeholder={t('bug_report.contact_placeholder')}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  disabled={isSubmitting}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting
                  ? t('bug_report.submitting')
                  : t('bug_report.submit')}
                {!isSubmitting && <Send className="ml-2 h-4 w-4" />}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
