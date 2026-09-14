'use client';

import { useState } from 'react';
import { runMastraAgent } from '@/actions/mastra-chat';

export function MastraForm() {
  const [input, setInput] = useState('');
  const [thread, setThread] = useState<string>();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      const result = await runMastraAgent(input, thread);
      setText(result.text);
      setThread(result.threadId);
    } catch (error) {
      setText(`调用失败：${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Mastra Agent PoC</h1>
      <p className="text-sm text-muted-foreground">
        DeepSeek + calculator / web_fetch 工具 + Memory。续聊会自动带上线程记忆。
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息，例如：23 * 17 等于多少 / 抓取 https://example.com"
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {loading ? '思考中…' : '发送'}
        </button>
      </form>

      {thread && (
        <p className="truncate text-xs text-muted-foreground">
          线程: {thread}
        </p>
      )}
      <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-4 text-sm">
        {text || '等待输入…'}
      </pre>
    </div>
  );
}