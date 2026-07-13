'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';
import { isKakaoTalkInAppBrowser } from '@/lib/in-app-browser';

function openInExternalBrowser() {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
}

function closeInAppBrowser() {
  window.location.href = 'kakaotalk://inappbrowser/close';
}

const emptySubscribe = () => () => {};

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

    const openTimer = setTimeout(openInExternalBrowser, 300);
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
    <div className="fixed inset-0 z-60 flex flex-col bg-background">
      <ListStatus
        title="외부 브라우저로 이동하고 있어요"
        description="더 나은 이용 경험을 위해 외부 브라우저로 열어드려요">
        <Button size="lg" onClick={openInExternalBrowser}>
          직접 열기
        </Button>
      </ListStatus>
    </div>,
    document.body,
  );
}
