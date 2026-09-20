'use client';

import { useEffect } from 'react';

import { useSession } from 'next-auth/react';

import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { setAnalyticsUser } from '@/observability/analytics';

export function AnalyticsUserSync() {
  const { data: session } = useSession();
  const { isMember } = useMemberAccess();
  const userId = session?.user?.id;

  useEffect(() => {
    if (isMember && userId) {
      setAnalyticsUser(userId);
    }
  }, [isMember, userId]);

  return null;
}
