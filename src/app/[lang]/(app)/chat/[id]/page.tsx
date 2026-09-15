import { conversationStore } from '@/store/conversation-store';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/user-auth';
import { ChatClient } from './chat-client';

interface ChatDetailPageProps {
  params: Promise<{ lang: string; id: string }>;
}

export default async function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { id } = await params; // React 19 可直接 await Promise params
  const user = await getCurrentUser();

  // 登录态：从服务端 conversationStore 取会话数据
  if (user) {
    const conversation = await conversationStore.get(user.id, id);
    if (!conversation) redirect('/chat');

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

  // 未登录：放开动态路由，数据由客户端从 conversationLocalStorage 恢复
  return <ChatClient key={id} isUserAuth={false} initialId={id} />;
}
