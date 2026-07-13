'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';
import { detectInAppBrowser } from '@/lib/in-app-browser';

function openExternalViaKakaoScheme() {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(
    window.location.href,
  )}`;
}

function closeKakaoInAppBrowser() {
  window.location.href = 'kakaotalk://inappbrowser/close';
}

function openExternalViaGenericScheme() {
  const { href, host, pathname, search, hash, protocol } = window.location;

  if (/android/i.test(navigator.userAgent)) {
    window.location.href =
      `intent://${host}${pathname}${search}${hash}` +
      `#Intent;scheme=${protocol.slice(0, -1)};end`;

    return;
  }

  window.location.href = `x-safari-${href}`;
}

const emptySubscribe = () => () => {};

export function InAppBrowserEscape() {
  const inAppBrowser = useSyncExternalStore(
    emptySubscribe,
    () => detectInAppBrowser(navigator.userAgent),
    () => null,
  );

  useEffect(() => {
    if (inAppBrowser !== 'kakaotalk') {
      return;
    }

    const openTimer = setTimeout(openExternalViaKakaoScheme, 300);
    const closeTimer = setTimeout(closeKakaoInAppBrowser, 1300);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [inAppBrowser]);

  if (!inAppBrowser) {
    return null;
  }

  const isKakao = inAppBrowser === 'kakaotalk';

  return createPortal(
    <div className="fixed inset-0 z-60 flex flex-col bg-background">
      <ListStatus
        title={
          isKakao
            ? '외부 브라우저로 이동 중이에요'
            : '현재 화면에서는 일부 기능이 제한돼요'
        }
        description={
          isKakao
            ? '자동으로 이동하지 않으면 아래 버튼을 눌러주세요'
            : '원활한 이용을 위해 외부 브라우저에서 열어주세요'
        }>
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={
              isKakao
                ? openExternalViaKakaoScheme
                : openExternalViaGenericScheme
            }>
            외부 브라우저에서 열기
          </Button>

          {!isKakao && (
            <p className="max-w-xs text-center text-xs text-foreground-secondary">
              버튼이 동작하지 않으면 메뉴(⋯)에서
              <br />
              &lsquo;외부 브라우저에서 열기&rsquo;를 선택해주세요.
            </p>
          )}
        </div>
      </ListStatus>
    </div>,
    document.body,
  );
}
