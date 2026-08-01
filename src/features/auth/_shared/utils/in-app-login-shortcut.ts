'use client';

import type { MouseEvent } from 'react';

import { detectInAppBrowser } from '@/lib/in-app-browser';

import { resolveLoginCallbackUrl } from './login-callback-url';
import { startInAppHandoffLogin } from './start-social-login';

/**
 * 모든 provider가 외부 전환을 요구하는 인앱 브라우저(인스타그램·쓰레드)에서는 /login
 * 화면을 거치지 않고 바로 핸드오프 로그인(외부 전환)을 시작한다. 이런 인앱의 /login은
 * 곧장 전환 안내로 튕기는 중간 단계일 뿐이기 때문이다. 카카오톡 인앱은 제외한다 —
 * 카카오 로그인이 인앱에서 그대로 완료되므로 /login이 방식 선택 화면으로 동작해야
 * 한다(스펙 §3-10). 일반 브라우저에서도 아무것도 하지 않아 기본 내비게이션이 유지된다.
 * 복귀 경로는 현재 화면으로 잡아, 로그인 완료 후 버튼을 눌렀던 화면으로 돌아오게 한다.
 *
 * @param event 로그인 링크의 클릭 이벤트(직행 대상 인앱이면 기본 이동을 막는다)
 */
export function startInAppLoginShortcut(
  event: MouseEvent<HTMLAnchorElement>,
): void {
  const inAppBrowser = detectInAppBrowser(navigator.userAgent);

  if (!inAppBrowser || inAppBrowser === 'kakaotalk') {
    return;
  }

  event.preventDefault();

  void startInAppHandoffLogin({
    redirectTo: resolveLoginCallbackUrl(window.location.pathname),
    inAppBrowser,
  });
}
