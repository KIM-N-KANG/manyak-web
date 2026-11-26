'use client';

import { useEffect, useRef } from 'react';

import { signOut, useSession } from 'next-auth/react';

import { APP_PATH } from '@/constants/app-path';
import { clearLocalMemberState } from '@/features/auth/_shared/utils/clear-local-member-state';
import {
  SESSION_EXPIRED_PARAM,
  subscribeSessionExpired,
} from '@/lib/auth/session-expiry';

/**
 * 세션 만료 신호를 구독해 로컬 회원 상태를 정리한 뒤 로그아웃하고, 만료 안내 쿼리 파라미터를 붙인 로그인
 * 화면으로 보낸다. 화면에는 아무것도 그리지 않는다.
 *
 * @remarks
 * 여러 요청이 동시에 만료를 알려도 한 번만 처리하고, 이미 비로그인 상태면 무시한다. 구독은 마운트 때 한 번만
 * 걸고 세션 상태는 ref로 읽는다. 로컬 정리가 실패해도 로그아웃은 진행한다.
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
      if (isHandlingRef.current || statusRef.current === 'unauthenticated') {
        return;
      }

      isHandlingRef.current = true;

      void clearLocalMemberState().finally(() =>
        signOut({
          redirectTo: `${APP_PATH.LOGIN}?${SESSION_EXPIRED_PARAM}`,
        }),
      );
    });
  }, []);

  return null;
}
