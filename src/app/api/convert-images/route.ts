import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/permissions';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // 验证图片转换权限
    const permissionCheck = await requirePermission('system:convertImages');
    if (!permissionCheck.allowed) {
      return permissionCheck.response;
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
