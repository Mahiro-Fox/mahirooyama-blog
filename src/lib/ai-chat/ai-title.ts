import { generateText, type UIMessage } from 'ai';
import type { ProviderValue } from '@/config/providers';
import { getModel } from './model';

// === 标题生成 ===
// 从 src/app/api/chat/route.ts 抽出，供 API route 与标题 server action 复用（服务端专用，不加 'use server'）。
export async function generateTitle(
  firstUserMessage: string,
  provider: ProviderValue,
  model: string
): Promise<string> {
  try {
    const { text } = await generateText({
      model: getModel(provider, model),
      prompt: `Based on the following user message, generate a concise title (max 15 words, in the same language as the user's message) for a conversation. Only output the title, nothing else — no quotes, no prefixes, no line breaks.

User message: "${firstUserMessage.slice(0, 300)}"

Title:`,
      temperature: 0.5,
    });
    const cleaned = text
      .trim()
      .replace(/^["'「『]|["'」』]$/g, '')
      .trim();
    return cleaned.length > 50
      ? cleaned.slice(0, 50) + '...'
      : cleaned || firstUserMessage.slice(0, 30) + '...';
  } catch (error) {
    console.error('Error generating title:', error);
    // 生成失败时退回到截取原文
    return firstUserMessage.slice(0, 30) + '...';
  }
}

export function getFirstUserText(messages: UIMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  return firstUserMsg?.parts?.find((p) => p.type === 'text')?.text ?? '';
}