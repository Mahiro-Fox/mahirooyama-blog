import { redirect } from 'next/navigation';
import { adminGetMidiFiles } from '@/actions/admin/midi-actions';

import { requirePermission } from '@/lib/permissions';

import MidiClient from './midi-client';

export default async function MidiAdminPage() {
  // Check permission
  const permissionCheck = await requirePermission('midi:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问 MIDI 管理');
  }

  const result = await adminGetMidiFiles();
  const files = result.success ? result.data : [];

  return <MidiClient initialFiles={files} />;
}
