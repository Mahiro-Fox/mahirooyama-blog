import { conversationStore } from '@/store/conversation-store';
import { NextResponse } from 'next/server';
import { verifyUserAuth } from '@/lib/user-auth';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await verifyUserAuth();
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summaries = await conversationStore.listByUser(auth.userId as string);
  return NextResponse.json(summaries);
}
