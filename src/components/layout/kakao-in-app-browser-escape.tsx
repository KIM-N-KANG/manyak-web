'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

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
 * 안내 오버레이는 body로 포털해 다이얼로그(z-50)를 포함한 앱 UI 전체를 덮는다.
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
    // (iOS는 앱 전환 후 웹뷰 스킴 내비게이션이 무시돼 닫히지 않는다.
    //  대신 안내 오버레이가 남아 수동 버튼으로 재이동할 수 있다)
    const closeTimer = setTimeout(closeInAppBrowser, 1300);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [isInAppBrowser]);

  if (!isInAppBrowser) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-6 bg-background px-8 text-center">
      <div className="space-y-2">
        <p className="text-lg font-semibold">외부 브라우저로 이동 중입니다</p>
        <p className="text-sm text-foreground-secondary">
          카카오톡 브라우저에서는 로그인이 제한되어
          <br />
          기본 브라우저로 열어드릴게요.
        </p>
      </div>
      <Button onClick={openInExternalBrowser}>브라우저에서 열기</Button>
    </div>,
    document.body,
  );
}
