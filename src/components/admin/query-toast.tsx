'use client';

import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function QueryToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const toastType = searchParams.get('toast');
    const message = searchParams.get('message');

    if (toastType === 'unauthorized' && message) {
      toast.error(message);
    }
  }, [searchParams]);

  return null;
}
