'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { detectInAppBrowser } from '@/lib/in-app-browser';
import { track } from '@/observability/analytics';

/**
 * 아무 것도 구독하지 않는 useSyncExternalStore용 빈 구독 함수를 만든다.
 *
 * @returns 구독 해제용 no-op 함수
 */
const emptySubscribe = () => () => {};

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
