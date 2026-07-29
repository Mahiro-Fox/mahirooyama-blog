import { getPublicGuestbook } from '@/actions/admin/guestbook-actions';

import { GuestbookWall } from './guestbook-wall';

export default async function GuestbookPage() {
  const result = await getPublicGuestbook();
  const entries = result.success ? result.data : [];

  return <GuestbookWall entries={entries} />;
}
