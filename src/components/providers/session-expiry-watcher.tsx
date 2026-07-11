'use client';

import { useEffect, useRef } from 'react';

import { signOut, useSession } from 'next-auth/react';

import { APP_PATH } from '@/constants/app-path';
import {
  SESSION_EXPIRED_PARAM,
  subscribeSessionExpired,
} from '@/lib/auth/session-expiry';
import { resetAnalyticsUser } from '@/observability/analytics';

/**
 * 프록시가 세션 만료(리프레시 확정 거절·복구 불가)를 알리면 능동 로그아웃한다. 서버는
 * 이미 토큰·세션 쿠키를 폐기했으므로, 여기서는 로그아웃을 마무리하고 로그인 페이지로
 * 강제 이동시킨다. 전체 페이지 전환이라 남은 회원 캐시도 함께 초기화된다.
 */
export function SessionExpiryWatcher() {
  const { status } = useSession();
  const statusRef = useRef(status);
  const isHandlingRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      // 이미 로그아웃됐거나(스테일 신호) 처리 중이면 건너뛴다. 'loading' 중 도착한
      // 신호는 유효하므로(프록시가 회원 세션 폐기를 확인한 것) 처리한다.
      if (isHandlingRef.current || statusRef.current === 'unauthenticated') {
        return;
      }

      isHandlingRef.current = true;

      resetAnalyticsUser();
      // 로그인 페이지 도착 후 만료 안내 토스트를 띄우도록 파라미터를 실어 이동한다
      // (전체 페이지 전환이라 이동 전 토스트는 사라지므로 도착 측에서 표시한다).
      void signOut({
        redirectTo: `${APP_PATH.LOGIN}?${SESSION_EXPIRED_PARAM}`,
      });
    });
  }, []);

  return null;
}
