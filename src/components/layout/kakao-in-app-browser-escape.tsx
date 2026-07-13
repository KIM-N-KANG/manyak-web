'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { isKakaoTalkInAppBrowser } from '@/lib/in-app-browser';

function openInExternalBrowser() {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
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
    if (isInAppBrowser) {
      openInExternalBrowser();
    }
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
