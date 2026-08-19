/**
 * 已停用。next-auth /api/auth/* 路由已废弃，详见 src/auth.ts。
 * 这里仍保持 GET/POST 导出以兼容 Next 路由约束，但统一返回 410 Gone。
 */

import { handlers } from '@/auth';

export const { GET, POST } = handlers;
