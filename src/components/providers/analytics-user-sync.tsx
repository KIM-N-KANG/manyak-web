'use client';

import { useEffect } from 'react';

import { useSession } from 'next-auth/react';

import { setAnalyticsUser } from '@/observability/analytics';

/** NextAuth 세션이 인증되면 Amplitude user_id·공통 프로퍼티를 동기화한다(스펙 §6-2). */
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
