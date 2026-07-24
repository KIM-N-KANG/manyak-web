'use client';

import { useEffect } from 'react';

import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';
import { openExternalBrowser } from '@/features/auth/_shared/utils/external-browser-escape';
import { type InAppBrowser } from '@/lib/in-app-browser';
import { track } from '@/observability/analytics';

type InAppEscapeGuideProps = {
  app: InAppBrowser;
};

/**
 * 카카오 탈출 스킴 호출 직전에 escapeAttempted를 계측하고 외부 전환을 시도한다(스펙 §6-4-2-12).
 * 자동 타이머와 수동 버튼이 공유한다.
 */
function attemptKakaoEscape(): void {
  track('client_inappBrowser_escapeAttempted', { app: 'kakaotalk' });
  openExternalBrowser(window.location.href, 'kakaotalk');
}

/**
 * 카카오 인앱에서 진입 직후 외부 브라우저 전환을 예약한다.
 * 0.3초 지연은 스킴이 렌더 완료 전에 실행되면 무시되는 것을 피하기 위함이다(카카오 우회 관습).
 * 인스타·쓰레드는 자동 전환이 막혀 예약하지 않고 수동 버튼·메뉴 안내로만 유도한다.
 *
 * @returns 정리용 타이머 핸들
 */
function scheduleKakaoAutoEscape(): ReturnType<typeof setTimeout> {
  return setTimeout(attemptKakaoEscape, 300);
}

/**
 * 카카오 안내 화면이 전환 시도 후에도 남아 있으면 탈출 실패로 보고 bannerShown을 1.6초 뒤
 * 계측한다. escapeAttempted 대비 이 비율이 실패율 대리 지표다(스펙 §6-4-2-12). 스킴 성공 시
 * 웹뷰가 백그라운드로 밀려도 컴포넌트가 살아 있으면 과다 집계될 수 있으나, 스킴 성공은
 * 콜백이 없어 직접 계측할 수 없는 한계다.
 *
 * @returns 정리용 타이머 핸들
 */
function scheduleKakaoBannerShown(): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    track('client_inappBrowser_bannerShown', { app: 'kakaotalk' });
  }, 1600);
}

export function InAppEscapeGuide({ app }: InAppEscapeGuideProps) {
  const isKakao = app === 'kakaotalk';

  useEffect(() => {
    if (isKakao) {
      return;
    }

    track('client_inappBrowser_bannerShown', { app });
  }, [isKakao, app]);

  useEffect(() => {
    if (!isKakao) {
      return;
    }

    const escapeTimer = scheduleKakaoAutoEscape();
    const bannerTimer = scheduleKakaoBannerShown();

    return () => {
      clearTimeout(escapeTimer);
      clearTimeout(bannerTimer);
    };
  }, [isKakao]);

  return (
    <ListStatus
      title="외부 브라우저에서 로그인해주세요"
      description={
        isKakao
          ? '자동으로 이동하지 않으면 아래 버튼을 눌러주세요'
          : '원활한 로그인을 위해 외부 브라우저에서 열어주세요'
      }>
      <div className="flex flex-col items-center gap-3">
        <Button
          type="button"
          size="lg"
          onClick={
            isKakao
              ? attemptKakaoEscape
              : () => openExternalBrowser(window.location.href, app)
          }>
          외부 브라우저에서 열기
        </Button>
        <p className="max-w-xs text-center text-xs leading-relaxed text-foreground-secondary">
          버튼이 동작하지 않으면 {isKakao ? '하단' : '상단'} 메뉴(⋮)에서
          <br />
          &lsquo;외부 브라우저에서 열기&rsquo;를 선택해 열어주세요
        </p>
      </div>
    </ListStatus>
  );
}
