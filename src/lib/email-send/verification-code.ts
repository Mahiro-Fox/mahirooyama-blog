import VerificationCodeEmail from '@/components/email/verification-code';
import { siteConfig } from '@/config/common';
import { sendEmailWithRetry } from './send-with-retry';

interface SendVerificationCodeParams {
  toEmail: string;
  code: string;
  expiresMinutes?: number;
}

/**
 * 发送邮箱验证码。
 * 复用 send-with-retry（3 次重试 + 超时控制），失败不抛异常，
 * 由调用方（server action）根据 success 决定返回给前端的错误码。
 */
export async function sendVerificationCode(params: SendVerificationCodeParams) {
  return sendEmailWithRetry({
    to: params.toEmail,
    subject: `${siteConfig.name} 邮箱验证码`,
    react: VerificationCodeEmail({
      code: params.code,
      siteName: siteConfig.name,
      expiresMinutes: params.expiresMinutes,
    }),
  });
}