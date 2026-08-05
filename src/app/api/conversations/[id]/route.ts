import { conversationStore } from '@/store/conversation-store';
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserAuth } from '@/lib/user-auth';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyUserAuth();
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await conversationStore.get(auth.userId as string, id);

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyUserAuth();
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  await conversationStore.delete(auth.userId as string, id);

  return NextResponse.json({ success: true });
}
