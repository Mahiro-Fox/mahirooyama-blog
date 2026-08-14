// import { LoadingScreen } from '@/components/shared/loading-screen';

/**
 * Next.js 路由加载边界
 *
 * 当以下情况发生时，Next.js 自动渲染本文件内容：
 * 1. 首次访问网站（SSR hydration 完成前）
 * 2. 用户在站内切换路由（layout 变化）
 *
 * 使用 Suspense 边界包裹，确保异步路由段的加载状态也能正确触发。
 */
export default function Loading() {
  return null;
}
