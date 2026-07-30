import { getPublicMoments } from '@/actions/admin/moments-actions';
import { MomentsTimeline } from './moments-timeline';

export default async function MomentsPage() {
  const result = await getPublicMoments();
  const moments = result.success ? result.data : [];

  return <MomentsTimeline moments={moments} />;
}
