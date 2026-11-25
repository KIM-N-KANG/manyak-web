'use client';

/**
 * @file 원래 탭을 떠나지 않고 팝업 창에서 Auth.js 소셜 로그인을 진행하는 흐름.
 * 사용자 클릭 안에서 빈 팝업을 먼저 열고(팝업 차단 회피), `signIn`이 돌려준 인증 URL로
 * 팝업을 보낸다. 완료 신호는 팝업 메시지, 원래 탭의 포커스와 표시 전환, 팝업 상태 폴링 세
 * 경로로 받고, 원래 탭에서 서버 세션을 확인해야 원래 탭을 다시 불러온다. 가입 동의 대기를 알리는
 * 팝업 메시지만은 조회 없이 바로 복귀한다. 타임아웃까지 결론이 나지 않으면 실패로 끝낸다. 모듈 스코프 플래그로 문서당
 * 로그인 시도 하나만 허용한다.
 */

import { getSession, signIn } from 'next-auth/react';

import { me } from '@/api/generated/endpoints/auth/auth';
import { APP_PATH } from '@/constants/app-path';
import { isPopupLoginMessage } from '@/lib/auth/popup-login';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { leaveLayers } from '@/lib/history-layers';

import { resolveLoginCallbackUrl } from './login-callback-url';
import { fetchPendingSignupConsent } from './signup-consent-client';

/** 팝업 로그인 한 번을 기다리는 최대 시간(ms, 5분). 만료되면 팝업은 닫지 않고 실패로만 끝낸다. */
const POPUP_TIMEOUT_MS = 5 * 60 * 1_000;

/** 공급자별 인증 화면 호스트. Auth.js가 돌려준 URL이 이 호스트가 아니면 팝업을 보내지 않는다. */
const AUTHORIZATION_HOSTS: Record<SocialLoginProvider, string> = {
  google: 'accounts.google.com',
  kakao: 'kauth.kakao.com',
};

/**
 * 팝업 로그인 결과.
 * - `redirected`: 원래 탭의 세션(또는 가입 동의 대기)을 확인해 복귀 경로로 다시 불러오기 시작했다.
 * - `failed`: 취소, 인증 실패, 타임아웃, 이미 진행 중인 시도가 있어 시작하지 못한 경우다.
 * - `blocked`: 브라우저가 팝업을 막아 창을 열지 못했다.
 */
export type PopupLoginOutcome = 'redirected' | 'failed' | 'blocked';

// ponytail: Auth.js의 공급자 트랜잭션 쿠키는 병렬 로그인을 지원하지 않아 문서당 한 번만 연다.
// 여러 로그인을 동시에 지원할 때는 공급자 트랜잭션부터 분리해야 한다.
/** 팝업 로그인 시도가 끝나지 않았는지. 결과가 정해지면(타임아웃 포함) false로 돌아간다. */
let popupLoginPending = false;
/**
 * `signIn` 시작 요청의 응답을 기다리는 중인지. 타임아웃으로 시도가 끝난 뒤에도 응답이 올
 * 때까지 유지해, 다음 시도의 시작 요청이 진행 중인 PKCE 쿠키를 덮어쓰지 않게 한다.
 */
let authorizationPending = false;
/** 이전 시도의 팝업. 타임아웃으로 남겨 둔 창을 다음 시도 때 닫는다. */
let previousPopup: Window | null = null;

/**
 * 사용자 클릭 중 빈 팝업을 먼저 열고 기존 Auth.js 소셜 인증을 그 창에서 진행한다.
 * 팝업 알림과 창 닫힘은 세션 재조회의 계기일 뿐이며 원래 창의 서버 세션을 확인해야 이동한다.
 * 원래 창은 OAuth 화면을 거치지 않으므로 로그인 뒤 뒤로가기가 인증 화면으로 가지 않는다.
 *
 * @remarks
 * - 문서당 한 시도만 진행한다. 이전 시도나 그 `signIn` 시작 응답이 남아 있으면 바로 `failed`다.
 * - `POPUP_TIMEOUT_MS`가 지나면 `failed`로 끝내되 팝업은 닫지 않고, 다음 시도 때 닫는다.
 * - 세션 없이 가입 동의가 대기 중이어도 `redirected`로 끝내, 원래 화면에서 동의 시트를 이어 간다.
 * - 팝업이 닫혀 보여도 COOP로 참조가 끊긴 것일 수 있어, 인증을 시작한 뒤에는 세션 확인 전까지 취소로 보지 않는다.
 *
 * @param provider 소셜 로그인 공급자
 * @param redirectTo 인증 완료 후 원래 창에서 이동할 앱 내 경로
 * @returns 원래 창 이동이 시작되면 redirected, 팝업이 차단됐으면 blocked, 취소나 실패이면 failed
 */
export function startPopupLogin(
  provider: SocialLoginProvider,
  redirectTo: string,
): Promise<PopupLoginOutcome> {
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
    return Promise.resolve('blocked');
  }

  if (!popup) {
    return Promise.resolve('blocked');
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

    const finish = (outcome: PopupLoginOutcome, closePopup = true) => {
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
        // 원래 탭을 다시 로드해 Auth.js 세션과 회원 쿼리를 함께 갱신한다. 로그인 필요 시트의 더미를 먼저 소비하고,
        // 로그인 화면 칸을 복귀 화면으로 바꿔 뒤로가기가 로그인 화면으로 돌아가지 않게 한다.
        leaveLayers(() => {
          window.location.replace(resolveLoginCallbackUrl(redirectTo));
        });
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
        } else if (
          (await fetchPendingSignupConsent().catch(() => null)) !== null
        ) {
          // 세션 없이 가입 동의가 대기 중이다. 원래 화면으로 돌아가 동의 시트를 이어 간다.
          if (!settled) {
            finish('redirected');
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

      if (event.data.consentRequired === true) {
        // 세션 없이 가입 동의가 대기 중이다. 원래 화면으로 돌아가 동의 시트를 이어 간다.
        finish('redirected');

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
        // 공급자 인증 중에는 동일 출처 정책으로 팝업의 주소를 읽을 수 없다.
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
    void signIn(provider, { redirect: false, redirectTo: callbackUrl.href })
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
          authorizationUrl.hostname !== AUTHORIZATION_HOSTS[provider]
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
