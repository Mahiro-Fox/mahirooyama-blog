import { getPublicMoments } from '@/actions/admin/moments-actions';

import { MomentsTimeline } from './moments-timeline';

export default async function MomentsPage() {
  const result = await getPublicMoments();
  const moments = result.success ? result.moments : [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">随记</h1>
        <p className="text-muted-foreground">记录生活中的美好时刻</p>
      </div>

      {moments.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          还没有随记，期待第一条...
        </div>
      ) : (
        <MomentsTimeline moments={moments} />
      )}
    </div>
  );
}
