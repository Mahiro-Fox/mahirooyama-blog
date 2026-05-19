import { getPublicGuestbookEntries } from '@/actions/admin/guestbook-actions';

import { GuestbookWallDialog } from './guestbook-dialog';
import { GuestbookWall } from './guestbook-wall';

export default async function GuestbookPage() {
  const result = await getPublicGuestbookEntries();
  const entries = result.success ? result.entries : [];

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
