import ReplyNotificationEmail from '@/components/admin/reply-notification';

import { sendEmailWithRetry } from './send-with-retry';

interface NotifyReplyParams {
  toEmail: string;
  originalMessage: string;
  replyContent: string;
  messageUrl: string; // 留言在网站上的链接，方便用户跳转查看
}

/**
 * 发送"留言被回复"通知邮件。
 * 发送失败时不抛异常，而是返回结果，由调用方决定要不要记录到数据库
 * （比如写入一张 failed_notifications 表，后台可以看到并手动补发）。
 */
export async function notifyReply(params: NotifyReplyParams) {
  const result = await sendEmailWithRetry({
    to: params.toEmail,
    subject: '你在留言墙的留言收到了回复',
    react: ReplyNotificationEmail({
      originalMessage: params.originalMessage,
      replyContent: params.replyContent,
      messageUrl: params.messageUrl,
    }),
  });

  return result;
}
