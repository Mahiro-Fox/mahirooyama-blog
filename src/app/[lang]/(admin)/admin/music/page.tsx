import { Metadata } from 'next';
import { adminGetMusic } from '@/actions/admin/music-actions';
import { requirePermission } from '@/lib/permissions';
import MusicClient from './music-client';

export const metadata: Metadata = {
  title: '音乐管理 | 管理后台',
};

export default async function MusicAdminPage() {
  await requirePermission('music:read');

  const musicRes = await adminGetMusic();
  const songs = musicRes.success ? musicRes.data : [];

  return <MusicClient songs={songs} />;
}
