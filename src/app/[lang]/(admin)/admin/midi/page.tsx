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
  const initialData: MidiAdminFilesPage = result.success
    ? result.data
    : {
        files: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };

  return <MidiClient initialData={initialData} />;
}
