import { getCurrentUser } from '@/lib/user-auth';
import { ChatClient } from './chat-client';

export default async function ChatPage() {
  const user = await getCurrentUser();

  return <ChatClient isUserAuth={!!user} />;
}
