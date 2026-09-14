import { execFileSync } from 'child_process';
import path from 'path';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 复用项目已有的 Python 纯工具执行器（ai-tools/tools_runner.py），
// 与现有 /api/chat 的 web_fetch 保持一致，工具计算统一由 Python 侧负责。
const AGENT_PYTHON = process.env.AGENT_PYTHON ?? 'python';
const TOOLS_RUNNER = path.join(process.cwd(), 'ai-tools', 'tools_runner.py');

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
    const out = execFileSync(
      AGENT_PYTHON,
      [TOOLS_RUNNER, '--exec', 'web_fetch', JSON.stringify({ url })],
      { encoding: 'utf-8', timeout: 15000 }
    );
    const parsed = JSON.parse(out.trim());
    if (!parsed.ok) {
      throw new Error(parsed.error ?? 'web_fetch 执行失败');
    }
    return parsed.result as {
      url: string;
      content_type: string;
      text: string;
    };
  },
});