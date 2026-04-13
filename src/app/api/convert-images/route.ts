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

    // 运行 convert 命令
    const { stdout, stderr } = await execAsync('pnpm convert', {
      cwd: process.cwd(),
      timeout: 120000, // 2分钟超时
    });

    if (stderr) {
      console.warn('convert warning:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: '转换完成',
      output: stdout,
    });
  } catch (error) {
    console.error('转换失败:', error);
    const errorMessage = error instanceof Error ? error.message : '转换失败';
    return NextResponse.json(
      { error: '转换失败', details: errorMessage },
      { status: 500 }
    );
  }
}
