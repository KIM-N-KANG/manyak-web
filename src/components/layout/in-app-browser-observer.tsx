'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { detectInAppBrowser } from '@/lib/in-app-browser';
import { track } from '@/observability/analytics';

/**
 * 아무 것도 구독하지 않는 useSyncExternalStore용 구독 함수다. 서버 렌더와 하이드레이션에서는
 * 서버 스냅숏을 쓰고, 그 뒤 렌더에서만 브라우저 값을 읽게 하려고 쓴다.
 *
 * @returns 구독 해제용 no-op 함수
 */
const emptySubscribe = () => () => {};

/**
 * 인앱 브라우저로 열렸으면 감지 이벤트(`client_inappBrowser_detected`)를 보내는 관측 컴포넌트.
 * 화면에는 아무것도 그리지 않고, 서버 렌더에서는 감지하지 않는다.
 */
export function InAppBrowserObserver() {
  const inAppBrowser = useSyncExternalStore(
    emptySubscribe,
    () => detectInAppBrowser(navigator.userAgent),
    () => null,
  );

  useEffect(() => {
    if (!inAppBrowser) {
      return;
    }

    track('client_inappBrowser_detected', { app: inAppBrowser });
  }, [inAppBrowser]);

  return null;
}
