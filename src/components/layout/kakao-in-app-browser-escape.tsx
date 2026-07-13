'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { isKakaoTalkInAppBrowser } from '@/lib/in-app-browser';

function openInExternalBrowser() {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
}

function closeInAppBrowser() {
  window.location.href = 'kakaotalk://inappbrowser/close';
}

const emptySubscribe = () => () => {};

/**
 * 카카오톡 인앱 브라우저 감지 시 기본 브라우저로 탈출시킨다.
 * (인앱 웹뷰에서는 Google OAuth가 disallowed_useragent로 차단됨)
 * 앱 프레임 내부에 마운트되어야 한다 (오버레이가 프레임 기준 absolute).
 */
export function KakaoInAppBrowserEscape() {
  const isInAppBrowser = useSyncExternalStore(
    emptySubscribe,
    () => isKakaoTalkInAppBrowser(navigator.userAgent),
    () => false,
  );

  useEffect(() => {
    if (!isInAppBrowser) {
      return;
    }

    // 앱 전환 전에 안내 오버레이가 먼저 페인트되도록 자동 이동을 지연한다.
    // (즉시 이동하면 웹뷰가 오버레이 없는 프레임에서 정지된 채 남는다)
    const openTimer = setTimeout(openInExternalBrowser, 300);
    // 외부 브라우저로 전환된 뒤 카톡에 남은 인앱 브라우저를 닫는다.
    const closeTimer = setTimeout(closeInAppBrowser, 1300);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [isInAppBrowser]);

  if (!isInAppBrowser) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-8 text-center">
      <div className="space-y-2">
        <p className="text-lg font-semibold">외부 브라우저로 이동 중입니다</p>
        <p className="text-sm text-foreground-secondary">
          카카오톡 브라우저에서는 로그인이 제한되어
          <br />
          기본 브라우저로 열어드릴게요.
        </p>
      </div>
      <Button onClick={openInExternalBrowser}>브라우저에서 열기</Button>
    </div>
  );
}
