import { BackToTop } from '@/components/layout/float-actions/back-to-top';
import { BugReportTrigger } from '@/components/layout/float-actions/bug-report-trigger';
import { ChatBubble } from '@/components/layout/float-actions/chat-bubble';

export function FloatActions() {
  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-center justify-center gap-2">
      {/* 聊天气泡组件 */}
      <ChatBubble />
      {/* 问题反馈组件 */}
      <BugReportTrigger />
      {/* 回到顶部组件 */}
      <BackToTop />
    </div>
  );
}
