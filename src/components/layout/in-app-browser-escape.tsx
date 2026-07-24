'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';
import { detectInAppBrowser } from '@/lib/in-app-browser';
import { track } from '@/observability/analytics';

/**
 * 카카오톡 인앱 브라우저에서 현재 URL을 외부 브라우저로 여는 스킴을 호출한다.
 */
function openExternalViaKakaoScheme() {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(
    window.location.href,
  )}`;
}

/**
 * 카카오톡 인앱 브라우저 창을 닫는 스킴을 호출한다.
 */
function closeKakaoInAppBrowser() {
  window.location.href = 'kakaotalk://inappbrowser/close';
}

/**
 * 일반 인앱 브라우저에서 플랫폼별 스킴으로 현재 URL을 외부 브라우저로 연다.
 */
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

/**
 * 카카오톡 탈출 스킴 호출 직전에 escapeAttempted를 계측한다(스펙 §6-4-2-12).
 * 자동 탈출 타이머와 수동 버튼이 공유한다.
 */
function attemptKakaoEscape() {
  track('client_inappBrowser_escapeAttempted', { app: 'kakaotalk' });
  openExternalViaKakaoScheme();
}

/**
 * 카카오톡 탈출·닫기 시도 후에도 컴포넌트가 살아 있으면 배너가 남은 것이므로
 * 탈출 실패로 보고 bannerShown을 계측한다(성공 시 Android는 창이 닫혀 언마운트됨).
 * escapeAttempted 대비 이 이벤트 비율이 실패율 대리 지표다(스펙 §6-4-2-12).
 * iOS는 성공해도 창이 남아 과다 집계될 수 있으나, 스킴 성공은 콜백이 없어 직접
 * 계측할 수 없는 한계다.
 */
function trackKakaoBannerShown() {
  track('client_inappBrowser_bannerShown', { app: 'kakaotalk' });
}

/**
 * 아무 것도 구독하지 않는 useSyncExternalStore용 빈 구독 함수를 만든다.
 *
 * @returns 구독 해제용 no-op 함수
 */
const emptySubscribe = () => () => {};

export function InAppBrowserEscape() {
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

    if (inAppBrowser !== 'kakaotalk') {
      track('client_inappBrowser_bannerShown', { app: inAppBrowser });
    }
  }, [inAppBrowser]);

  useEffect(() => {
    if (inAppBrowser !== 'kakaotalk') {
      return;
    }

    const openTimer = setTimeout(attemptKakaoEscape, 300);
    const closeTimer = setTimeout(closeKakaoInAppBrowser, 1300);
    const bannerTimer = setTimeout(trackKakaoBannerShown, 1600);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      clearTimeout(bannerTimer);
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
              isKakao ? attemptKakaoEscape : openExternalViaGenericScheme
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
