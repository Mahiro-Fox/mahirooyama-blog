'use client';

import { useT } from '@/i18n/dictionary-provider';

export default function PageTitle({ tKey }: { tKey: string }) {
  console.log(tKey);
  const t = useT();
  return (
    <div className="flex flex-col gap-1 pb-6">
      <h2 className="text-2xl font-medium tracking-tight">{t(tKey)}</h2>
    </div>
  );
}
