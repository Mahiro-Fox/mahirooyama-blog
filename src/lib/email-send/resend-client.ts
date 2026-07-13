import { Resend } from 'resend';

// 单例模式，避免每次请求都 new 一个新的 client
let resendInstance: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('缺少环境变量 RESEND_API_KEY，请在 .env.local 中配置');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// 统一管理发件地址，避免散落在各处硬编码
export const EMAIL_FROM = process.env.EMAIL_FROM ?? '你的网站 <notify@yourdomain.com>';
