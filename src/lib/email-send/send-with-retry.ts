import { render } from '@react-email/components';
import { ReactElement } from 'react';
import { EMAIL_FROM, getResendClient } from './resend-client';

interface SendEmailParams {
  to: string;
  subject: string;
  react: ReactElement;
}

interface SendResult {
  success: boolean;
  emailId?: string;
  error?: string;
  attempts: number;
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 8000; // 国内访问境外 API，8 秒超时比较合理，太长会拖慢整个请求
const RETRY_BASE_DELAY_MS = 1000; // 指数退避基础延迟：1s、2s、4s

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 给单次 fetch 加超时控制。
 * Resend SDK 内部用 fetch，如果网络卡住，默认不会主动超时，
 * 所以用 AbortController 包一层。
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 带重试的邮件发送。
 * 失败会按 1s / 2s / 4s 的间隔重试，最多 MAX_RETRIES 次。
 * 全部失败后返回 success: false，不抛出异常——
 * 调用方（比如"提交回复"的接口）不应该因为邮件发送失败而报错。
 */
export async function sendEmailWithRetry(
  params: SendEmailParams
): Promise<SendResult> {
  const resend = getResendClient();
  let lastError = '';

  // 提前渲染好 html 和纯文本版本，避免每次重试都重复渲染
  const html = await render(params.react);
  const text = await render(params.react, { plainText: true });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await withTimeout(
        resend.emails.send({
          from: EMAIL_FROM,
          to: params.to,
          subject: params.subject,
          html,
          text, // 提供纯文本版本，构成 multipart/alternative，对送达率有帮助
        }),
        TIMEOUT_MS
      );

      // Resend SDK 把网络失败和 API 错误都塞进 error 字段，
      // 不是抛异常，所以要显式检查
      if (result.error) {
        lastError = result.error.message;
        console.warn(
          `[email] 第 ${attempt} 次发送失败: ${lastError}，收件人: ${params.to}`
        );
      } else {
        console.log(
          `[email] 发送成功，尝试次数: ${attempt}，邮件 ID: ${result.data?.id}`
        );
        return { success: true, emailId: result.data?.id, attempts: attempt };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `[email] 第 ${attempt} 次发送异常: ${lastError}，收件人: ${params.to}`
      );
    }

    // 最后一次尝试失败就不用再等了
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  console.error(
    `[email] 发送最终失败，已重试 ${MAX_RETRIES} 次，收件人: ${params.to}，原因: ${lastError}`
  );

  return { success: false, error: lastError, attempts: MAX_RETRIES };
}
