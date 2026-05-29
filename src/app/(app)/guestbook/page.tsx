import { Metadata } from 'next';
import { getPublicGuestbookEntries } from '@/actions/admin/guestbook-actions';

import { GuestbookWallDialog } from './guestbook-dialog';
import { GuestbookWall } from './guestbook-wall';

export const metadata: Metadata = {
  title:
    "欢迎来到 mahirooyama 的留言墙喵~ - Welcome to mahiooyama's guestbook wall",
  description: `有什么想对mahiro说的话，都可以在这里留下喵~ - Feel free to leave any messages for Mahiro here~`,
  keywords: [
    '留言墙',
    'guestbook',
    'mahirooyama',
    'mahiooyama',
    'leave messages',
    'contact mahiro',
  ],
};

export default async function GuestbookPage() {
  const result = await getPublicGuestbookEntries();
  const entries = result.success ? result.data : [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold">留言墙</h1>
        <p className="text-muted-foreground">
          有什么想对我说的话，都可以在这里留下喵~
        </p>
      </div>
      {entries.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          还没有留言，成为第一个留言的人吧！
        </div>
      )}
      <GuestbookWallDialog />
      {entries.length !== 0 && <GuestbookWall entries={entries} />}
    </div>
  );
}
