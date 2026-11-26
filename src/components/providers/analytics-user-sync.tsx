'use client';

import { useEffect } from 'react';

import { useSession } from 'next-auth/react';

import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { setAnalyticsUser } from '@/observability/analytics';

/**
 * 동의 게이트가 회원으로 판정한 세션의 사용자 ID를 분석 사용자로 설정한다. 게스트는 식별하지 않는다.
 * 로그아웃 때의 해제는 여기서 하지 않고 `clearLocalMemberState`가 맡는다. 화면에는 아무것도 그리지 않는다.
 */
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
