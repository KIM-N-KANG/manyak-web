'use client';

import { getSession, signIn } from 'next-auth/react';

import { me } from '@/api/generated/endpoints/auth/auth';
import { APP_PATH } from '@/constants/app-path';
import { isPopupLoginMessage } from '@/lib/auth/popup-login';

import { resolveLoginCallbackUrl } from './login-callback-url';

const POPUP_TIMEOUT_MS = 5 * 60 * 1_000;

// ponytail: Auth.js의 Google 트랜잭션 쿠키는 병렬 로그인을 지원하지 않아 문서당 한 번만 연다.
// 여러 로그인을 동시에 지원할 때는 공급자 트랜잭션부터 분리해야 한다.
let popupLoginPending = false;

/**
 * 사용자 클릭 중 빈 팝업을 먼저 열고 기존 Auth.js Google 인증을 그 창에서 진행한다.
 * 팝업 알림과 창 닫힘은 세션 재조회의 계기일 뿐이며 원래 창의 서버 세션을 확인해야 이동한다.
 * @param redirectTo 인증 완료 후 원래 창에서 이동할 앱 내 경로
 * @returns 원래 창 이동이 시작되면 redirected, 취소나 실패이면 failed
 */
export function startGooglePopupLogin(
  redirectTo: string,
): Promise<'redirected' | 'failed'> {
  if (popupLoginPending) {
    return Promise.resolve('failed');
  }

  const attempt = crypto.randomUUID();
  let popup: Window | null;

  try {
    popup = window.open('about:blank', '_blank', 'popup,width=500,height=700');
  } catch {
    return Promise.resolve('failed');
  }

  if (!popup) {
    return Promise.resolve('failed');
  }

  popupLoginPending = true;

  const origin = window.location.origin;
  const callbackUrl = new URL(APP_PATH.LOGIN_POPUP_COMPLETE, origin);

  callbackUrl.searchParams.set('attempt', attempt);

  return new Promise((resolve) => {
    let settled = false;
    let checkingSession = false;
    let authorizationStarted = false;

    const finish = (outcome: 'redirected' | 'failed') => {
      if (settled) {
        return;
      }

      settled = true;
      popupLoginPending = false;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      try {
        popup.close();
      } catch {
        // 앱이 창 제어를 차단해도 원래 탭의 진행 잠금은 해제한다.
      }

      resolve(outcome);

      if (outcome === 'redirected') {
        // 원래 탭을 다시 로드해 Auth.js 세션과 회원 쿼리를 함께 갱신한다.
        window.location.assign(resolveLoginCallbackUrl(redirectTo));
      }
    };

    const checkSession = async (failIfGuest: boolean) => {
      if (settled || checkingSession || !authorizationStarted) {
        return;
      }

      checkingSession = true;

      try {
        const session = await getSession();

        if (settled) {
          return;
        }

        if (session?.user?.id) {
          const member = await me();

          if (member.status === 200 && member.data.id === session.user.id) {
            finish('redirected');
          } else if (failIfGuest) {
            finish('failed');
          }
        } else if (failIfGuest) {
          finish('failed');
        }
      } catch {
        if (failIfGuest) {
          finish('failed');
        }
      } finally {
        checkingSession = false;
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== origin ||
        event.source !== popup ||
        !isPopupLoginMessage(event.data, attempt)
      ) {
        return;
      }

      if (!event.data.authenticated) {
        finish('failed');

        return;
      }

      void checkSession(true);
    };

    const onFocus = () => void checkSession(popup.closed);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onFocus();
      }
    };

    const interval = window.setInterval(() => {
      if (popup.closed) {
        // COOP로 창 참조만 끊어질 수 있으므로 원래 문서가 다시 활성화될 때 판정한다.
        if (document.hasFocus()) {
          if (authorizationStarted) {
            void checkSession(true);
          } else {
            finish('failed');
          }
        }

        return;
      }

      try {
        const url = new URL(popup.location.href);

        if (
          url.origin === origin &&
          url.pathname === APP_PATH.LOGIN &&
          url.searchParams.has('error')
        ) {
          finish('failed');
        }
      } catch {
        // Google 인증 중에는 동일 출처 정책으로 팝업의 주소를 읽을 수 없다.
      }
    }, 500);
    const timeout = window.setTimeout(() => finish('failed'), POPUP_TIMEOUT_MS);

    window.addEventListener('message', onMessage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    void signIn('google', { redirect: false, redirectTo: callbackUrl.href })
      .then((result) => {
        if (settled) {
          return;
        }

        if (result.error || !result.url || popup.closed) {
          finish('failed');

          return;
        }

        const authorizationUrl = new URL(result.url);

        if (
          authorizationUrl.protocol !== 'https:' ||
          authorizationUrl.hostname !== 'accounts.google.com'
        ) {
          finish('failed');

          return;
        }

        authorizationStarted = true;
        popup.location.replace(authorizationUrl.href);
      })
      .catch(() => finish('failed'));
  });
}
