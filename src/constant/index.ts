// 常量模块统一导出 (底层技术常量)
// 存放底层、技术性、硬编码的固定值。这些值通常是系统架构的一部分，不随业务策略轻易改变。
//
// ⚠️ 注意：auth.ts 包含 JWT_SECRET 等敏感配置，仅限服务端使用，不在此处导出！
// 服务端文件请直接 import { JWT_SECRET } from '@/constant/auth'

export * from './dir';
// export * from './auth'; // ❌ 不要在此导出！包含敏感信息，仅供服务端使用
export * from './cache';
export * from './tag';
export * from './permissions';
