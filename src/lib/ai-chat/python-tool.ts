import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const AGENT_PYTHON = process.env.AGENT_PYTHON ?? 'python';
const TOOLS_RUNNER = path.join(process.cwd(), 'ai-tools', 'tools_runner.py');

/**
 * 调用 ai-tools/tools_runner.py。异步执行，避免卡住 Node 事件循环。
 */
export async function runPythonTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  let stdout: string;
  try {
    const result = await execFileAsync(
      AGENT_PYTHON,
      [TOOLS_RUNNER, '--exec', name, JSON.stringify(args)],
      { encoding: 'utf8', timeout: 15_000 }
    );
    stdout = result.stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`tool ${name} failed: ${message}`);
  }

  const parsed = JSON.parse(stdout.trim()) as {
    ok?: boolean;
    error?: string;
    result?: unknown;
  };
  if (!parsed.ok) {
    throw new Error(parsed.error ?? `tool ${name} failed`);
  }
  return parsed.result;
}
