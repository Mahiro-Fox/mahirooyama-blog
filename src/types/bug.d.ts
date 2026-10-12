/**
 * BUG 报告类型
 *
 * 取数逻辑见 src/store/bug-store.ts。
 */

type BugStatus = 'pending' | 'resolved';

interface BugReport {
  id: string;
  createdAt: string;
  content: string;
  status: BugStatus;
  contact?: string;
  userAgent?: string;
  url?: string;
}
