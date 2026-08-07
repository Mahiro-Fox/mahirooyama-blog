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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyUserAuth();
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { title?: string };

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const trimmed = body.title.trim();
  if (trimmed.length === 0 || trimmed.length > 100) {
    return NextResponse.json(
      { error: 'Title must be 1-100 characters' },
      { status: 400 }
    );
  }

  await conversationStore.updateTitle(auth.userId as string, id, trimmed);

  return NextResponse.json({ success: true, title: trimmed });
}
