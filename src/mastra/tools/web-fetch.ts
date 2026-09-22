import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { runPythonTool } from '@/lib/ai-chat/python-tool';

export const webFetch = createTool({
  id: 'web_fetch',
  description:
    '抓取指定网页并提取可读纯文本（含 JSON API），用于查询游戏攻略 Wiki、百科、VRChat 世界等任意外部网页，返回前 4000 字符。',
  inputSchema: z.object({
    url: z.string().url().describe('要抓取的 http/https 网页地址'),
  }),
  outputSchema: z.object({
    url: z.string(),
    content_type: z.string(),
    text: z.string(),
  }),
  execute: async ({ url }) => {
    const result = await runPythonTool('web_fetch', { url });
    return result as {
      url: string;
      content_type: string;
      text: string;
    };
  },
});
