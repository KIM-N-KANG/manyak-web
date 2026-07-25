'use client';

import type { MouseEvent } from 'react';

import { detectInAppBrowser } from '@/lib/in-app-browser';

import { resolveLoginCallbackUrl } from './login-callback-url';
import { startGoogleLogin } from './start-google-login';

/**
 * 인앱 브라우저에서는 /login 화면을 거치지 않고 바로 핸드오프 로그인(외부 전환)을 시작한다.
 * 인앱의 /login은 Google 버튼 하나뿐이라 곧장 전환 안내로 튕기는 중간 단계일 뿐이기
 * 때문이다. 일반 브라우저에서는 아무것도 하지 않아 기본 내비게이션(/login 이동)이 유지된다.
 * 복귀 경로는 현재 화면으로 잡아, 로그인 완료 후 버튼을 눌렀던 화면으로 돌아오게 한다.
 *
 * @param event 로그인 링크의 클릭 이벤트(인앱이면 기본 이동을 막는다)
 */
export function startInAppLoginShortcut(
  event: MouseEvent<HTMLAnchorElement>,
): void {
  if (!detectInAppBrowser(navigator.userAgent)) {
    return;
  }

  event.preventDefault();

  void startGoogleLogin({
    redirectTo: resolveLoginCallbackUrl(window.location.pathname),
  });
}
