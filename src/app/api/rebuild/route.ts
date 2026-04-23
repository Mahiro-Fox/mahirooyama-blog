import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // 验证管理员权限
    const payload = await verifyAuth();
    if (!payload) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    // 中断服务（linux）
    const { stdout: killStdout, stderr: killStderr } = await execAsync('killall node', {
      cwd: process.cwd(),
    });
    if (killStderr) {
      console.warn('kill warning:', killStderr);
    }

    // 运行 build 命令
    const { stdout, stderr } = await execAsync('pnpm build & pnpm start', {
      cwd: process.cwd(),
      timeout: 120000, // 2分钟超时
    });

    if (stderr) {
      console.warn('build warning:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: '构建完成',
      output: stdout,
    });
  } catch (error) {
    console.error('构建失败:', error);
    const errorMessage = error instanceof Error ? error.message : '构建失败';
    return NextResponse.json(
      { error: '构建失败', details: errorMessage },
      { status: 500 }
    );
  }
}
