import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 只允许数字与基础运算符，杜绝任意代码注入
const EXPR_RE = /^[\d\s+\-*/%^().]+$/;

export const calculator = createTool({
  id: 'calculator',
  description:
    '计算数学表达式，支持 + - * / // % ** ^ 和括号，返回计算结果。',
  inputSchema: z.object({
    expression: z.string().describe('要计算的数学表达式，例如 23*17 或 (1+2)^3'),
  }),
  outputSchema: z.string(),
  execute: async ({ expression }) => {
    const expr = expression.trim();
    if (!expr) {
      throw new Error('缺少表达式：expression 必须为非空字符串');
    }
    if (!EXPR_RE.test(expr)) {
      throw new Error(`表达式含非法字符：仅支持数字和 + - * / % ^ ( )`);
    }
    // ^ 转幂运算（JS 用 **）
    const sanitized = expr.replace(/\^/g, '**');
    let value: unknown;
    try {
      // 经白名单正则校验后仅剩算术符号，Function 求值无注入风险
      value = Function(`'use strict'; return (${sanitized});`)();
    } catch (error) {
      throw new Error(`表达式求值失败: ${(error as Error).message}`);
    }
    return String(value);
  },
});