'use client';

import { useEffect } from 'react';

import { useSession } from 'next-auth/react';

import { setAnalyticsUser } from '@/observability/analytics';

export function AnalyticsUserSync() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      setAnalyticsUser(userId);
    }
  }, [userId]);

  return null;
}
