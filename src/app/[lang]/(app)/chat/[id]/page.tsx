import { conversationStore } from '@/store/conversation-store';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/user-auth';
import { ChatClient } from './chat-client';

interface ChatDetailPageProps {
  params: Promise<{ lang: string; id: string }>;
}

export default async function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { lang, id } = await params; // React 19 可直接 await Promise params
  const user = await getCurrentUser();

  // 仅登录态的会话走 /chat/[id]；未登录回新对话页
  if (!user) redirect(`/${lang}/chat`);

  const conversation = await conversationStore.get(user.id, id);
  if (!conversation) return notFound();

  // key={id}：切换 /chat/[id1] -> /chat/[id2] 时强制重挂载 ChatClient，
  // 让 useChat 用新的 initialMessages（client 组件复用实例时初始消息不会更新）
  return (
    <ChatClient
      key={id}
      isUserAuth={true}
      initialId={id}
      initialMessages={conversation.messages}
    />
  );
}
