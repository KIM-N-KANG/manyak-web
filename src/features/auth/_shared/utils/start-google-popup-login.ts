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
let authorizationPending = false;
let previousPopup: Window | null = null;

/**
 * 사용자 클릭 중 빈 팝업을 먼저 열고 기존 Auth.js Google 인증을 그 창에서 진행한다.
 * 팝업 알림과 창 닫힘은 세션 재조회의 계기일 뿐이며 원래 창의 서버 세션을 확인해야 이동한다.
 * @param redirectTo 인증 완료 후 원래 창에서 이동할 앱 내 경로
 * @returns 원래 창 이동이 시작되면 redirected, 취소나 실패이면 failed
 */
export function startGooglePopupLogin(
  redirectTo: string,
): Promise<'redirected' | 'failed'> {
  if (popupLoginPending || authorizationPending) {
    return Promise.resolve('failed');
  }

  const attempt = crypto.randomUUID();
  let popup: Window | null;

  try {
    // 만료 자체로 인증창을 닫지 않는다. 사용자가 재시도할 때 이전 창을 정리한다.
    previousPopup?.close();
    previousPopup = null;
    popup = window.open('about:blank', '_blank', 'popup,width=500,height=700');
  } catch {
    return Promise.resolve('failed');
  }

  if (!popup) {
    return Promise.resolve('failed');
  }

  popupLoginPending = true;
  previousPopup = popup;

  const origin = window.location.origin;
  const callbackUrl = new URL(APP_PATH.LOGIN_POPUP_COMPLETE, origin);

  callbackUrl.searchParams.set('attempt', attempt);

  return new Promise((resolve) => {
    let settled = false;
    let checkingSession = false;
    let authorizationStarted = false;

    const finish = (outcome: 'redirected' | 'failed', closePopup = true) => {
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

      if (closePopup) {
        try {
          popup.close();
        } catch {
          // COOP로 참조가 끊기면 창을 닫을 수 없다. 서버의 OAuth 검증은 유지한다.
        }

        previousPopup = null;
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

          if (settled) {
            return;
          }

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

    // closed는 COOP 참조 단절도 뜻하므로 미인증 상태를 취소로 확정하지 않는다.
    const onFocus = () => void checkSession(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onFocus();
      }
    };

    const interval = window.setInterval(() => {
      if (popup.closed) {
        // 참조가 끊겨도 원래 창에서 완료된 세션을 확인할 때까지 기다린다.
        if (document.hasFocus()) {
          if (authorizationStarted) {
            void checkSession(false);
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
    const timeout = window.setTimeout(
      () => finish('failed', false),
      POPUP_TIMEOUT_MS,
    );

    window.addEventListener('message', onMessage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 만료 후에도 진행 중인 시작 응답이 새 PKCE 쿠키를 덮어쓰지 않도록 직렬화한다.
    authorizationPending = true;
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
      .catch(() => finish('failed'))
      .finally(() => {
        authorizationPending = false;
      });
  });
}
