'use client';

import { type InAppBrowser } from '@/lib/in-app-browser';

/**
 * 카카오톡 인앱 브라우저에서 주어진 URL을 외부 브라우저로 여는 스킴을 호출한다.
 *
 * @param url 외부 브라우저로 열 절대 URL
 */
function openExternalViaKakaoScheme(url: string): void {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(
    url,
  )}`;
}

/**
 * 일반 인앱 브라우저(인스타그램·쓰레드)에서 플랫폼별 스킴으로 주어진 URL을 외부 브라우저로 연다.
 * Android는 intent:// 스킴, iOS는 x-safari- 접두 스킴을 쓴다.
 *
 * @param url 외부 브라우저로 열 절대 URL
 */
function openExternalViaGenericScheme(url: string): void {
  const { href, host, pathname, search, hash, protocol } = new URL(url);

  if (/android/i.test(navigator.userAgent)) {
    window.location.href =
      `intent://${host}${pathname}${search}${hash}` +
      `#Intent;scheme=${protocol.slice(0, -1)};end`;

    return;
  }

  window.location.href = `x-safari-${href}`;
}

/**
 * 인앱 브라우저 종류에 맞는 스킴으로 주어진 URL을 외부 브라우저에서 연다.
 * 스킴 호출은 성공 콜백이 없어 실패해도 감지할 수 없으므로, 호출부는 수동 대안을 함께 제공한다.
 *
 * @param url 외부 브라우저로 열 절대 URL
 * @param app 현재 인앱 브라우저 종류
 */
export function openExternalBrowser(url: string, app: InAppBrowser): void {
  if (app === 'kakaotalk') {
    openExternalViaKakaoScheme(url);

    return;
  }

  openExternalViaGenericScheme(url);
}
