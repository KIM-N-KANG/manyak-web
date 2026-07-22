'use client';

import { useEffect, useRef } from 'react';

import { signOut, useSession } from 'next-auth/react';

import { APP_PATH } from '@/constants/app-path';
import { clearPendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  SESSION_EXPIRED_PARAM,
  subscribeSessionExpired,
} from '@/lib/auth/session-expiry';
import { resetAnalyticsUser } from '@/observability/analytics';

export function SessionExpiryWatcher() {
  const { status } = useSession();
  const statusRef = useRef(status);
  const isHandlingRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      if (isHandlingRef.current || statusRef.current === 'unauthenticated') {
        return;
      }

      isHandlingRef.current = true;

      resetAnalyticsUser();
      // 명시적 로그아웃과 동일한 정리 — 세션 만료 로그아웃에서도 생성 복구
      // 레코드는 서버에서 되찾을 수 없으므로 슬롯을 비운다.
      clearPendingCreationRequest();
      void signOut({
        redirectTo: `${APP_PATH.LOGIN}?${SESSION_EXPIRED_PARAM}`,
      });
    });
  }, []);

  return null;
}
