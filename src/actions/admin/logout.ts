'use server';

import { adminLogoutViaGo } from '@/lib/admin-auth';

export async function adminLogout() {
  // 直接委托 lib/admin-auth 内统一实现（调 Go 端 + 删 cookie）
  return adminLogoutViaGo();
}
