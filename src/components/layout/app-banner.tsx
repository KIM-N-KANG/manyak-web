'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

import {
  type AppBannerGuide,
  AppBannerGuideSheet,
} from '@/components/layout/app-banner-guide-sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  APP_BANNER_COPY,
  APP_BANNER_VARIANT_COPY,
} from '@/constants/app-banner';
import { APP_SCREEN_ID } from '@/constants/app-frame';
import { SITE_NAME } from '@/constants/site';
import {
  ANDROID_PLAY_STORE_URL,
  APP_OPEN_FALLBACK_DELAY_MS,
  type AppBannerVariant,
  buildAppIntentUrl,
  dismissAppBanner,
  isAndroidVariant,
  isAppBannerDismissed,
  parseStoryDetailId,
  recordSessionVisit,
  resolveAppBannerVariant,
  scheduleEscapeFallback,
  shouldShowAppBanner,
  supportsHomeScreenImageGuide,
} from '@/lib/app-banner';
import { isStandaloneDisplay } from '@/lib/device';
import { openExternalBrowser } from '@/lib/external-browser-escape';
import { detectInAppBrowser } from '@/lib/in-app-browser';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

/** 외부 브라우저 전환을 시도한 뒤 실패로 판단하기까지 기다리는 시간(ms)이다. */
const ESCAPE_FALLBACK_DELAY_MS = 1500;

/**
 * 배너 버튼에 primaryOutline 위로 덧씌우는 클래스다. 진한 초록 아이콘과 겹치지 않게 테두리를
 * 빼고, 연한 초록 바탕에서도 작은 글자 대비 4.5:1을 넘도록 초록에 글자색을 30% 섞는다.
 */
const ACTION_BUTTON_CLASS =
  'border-transparent text-[color-mix(in_oklch,var(--primary),var(--foreground)_30%)]';

/**
 * 아무 것도 구독하지 않는 useSyncExternalStore용 빈 구독 함수를 만든다.
 *
 * @returns 구독 해제용 no-op 함수
 */
const emptySubscribe = () => () => {};

/**
 * 현재 브라우저와 경로에서 보여줄 배너 변형을 정한다. 노출 대상일 때만 접속 회차를
 * 세므로 미노출 화면만 본 세션은 접속으로 세지 않는다. 회차 기록은 탭마다 한 번이라
 * 렌더마다 불러도 결과가 같다.
 *
 * @param pathname 현재 경로
 * @returns 보여줄 변형, 숨기면 null
 */
function readVisibleVariant(pathname: string): AppBannerVariant | null {
  const variant = resolveAppBannerVariant({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    isStandalone: isStandaloneDisplay(),
    pathname,
  });

  if (variant === null) {
    return null;
  }

  return shouldShowAppBanner(
    variant,
    recordSessionVisit(),
    isAppBannerDismissed(),
  )
    ? variant
    : null;
}

/**
 * 배너 이벤트 프로퍼티를 만든다. `destination`은 Android 변형만, `story_id`는
 * 스토리 상세에서만 싣는다.
 *
 * @param variant 배너 변형
 * @param pathname 현재 경로
 * @returns 이벤트 프로퍼티
 */
function buildEventProps(variant: AppBannerVariant, pathname: string) {
  const storyId = parseStoryDetailId(pathname);

  return {
    variant,
    ...(isAndroidVariant(variant)
      ? {
          destination:
            storyId === null ? ('home' as const) : ('story' as const),
        }
      : {}),
    ...(storyId === null ? {} : { story_id: storyId }),
  };
}

/**
 * 배너 아래 화면 영역으로 포커스를 옮긴다. 닫기 버튼이 사라지며 포커스가 문서 처음으로
 * 가지 않게 한다. 평소에는 영역을 포커스 대상에서 빼 두려고 tabindex를 블러 때 지운다.
 */
function focusAppScreen(): void {
  const screen = document.getElementById(APP_SCREEN_ID);

  if (!screen) {
    return;
  }

  screen.tabIndex = -1;
  screen.focus({ preventScroll: true });
  screen.addEventListener('blur', () => screen.removeAttribute('tabindex'), {
    once: true,
  });
}

export function AppBanner() {
  const pathname = usePathname();
  const variant = useSyncExternalStore(
    emptySubscribe,
    () => readVisibleVariant(pathname),
    () => null,
  );
  const shouldReduceMotion = useReducedMotion();
  const [isClosed, setIsClosed] = useState(false);
  const [guide, setGuide] = useState<AppBannerGuide>('homeScreenText');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const hasTrackedShownRef = useRef(false);
  const cancelEscapeFallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (variant === null || hasTrackedShownRef.current) {
      return;
    }

    hasTrackedShownRef.current = true;
    track('client_appBanner_shown', buildEventProps(variant, pathname));
  }, [variant, pathname]);

  const openGuide = (next: AppBannerGuide) => {
    setGuide(next);
    setIsGuideOpen(true);
  };

  const handleAction = (shownVariant: AppBannerVariant) => {
    track(
      'client_appBanner_actionButton_clicked',
      buildEventProps(shownVariant, pathname),
    );

    if (shownVariant === 'ios_inapp') {
      openExternalBrowser(
        window.location.href,
        detectInAppBrowser(navigator.userAgent),
      );
      cancelEscapeFallbackRef.current?.();
      cancelEscapeFallbackRef.current = scheduleEscapeFallback(() => {
        track('client_appBanner_escapeGuide_shown');
        openGuide('escape');
      }, ESCAPE_FALLBACK_DELAY_MS);

      return;
    }

    if (isAndroidVariant(shownVariant)) {
      cancelEscapeFallbackRef.current?.();
      cancelEscapeFallbackRef.current = scheduleEscapeFallback(() => {
        window.location.assign(ANDROID_PLAY_STORE_URL);
      }, APP_OPEN_FALLBACK_DELAY_MS);

      return;
    }

    if (shownVariant === 'ios_browser') {
      openGuide(
        supportsHomeScreenImageGuide(navigator.userAgent)
          ? 'homeScreenImages'
          : 'homeScreenText',
      );
    }
  };

  const handleClose = (shownVariant: AppBannerVariant) => {
    track('client_appBanner_closeButton_clicked', { variant: shownVariant });
    dismissAppBanner();
    focusAppScreen();
    setIsClosed(true);
  };

  return (
    <>
      <AnimatePresence>
        {variant !== null && !isClosed && (
          <m.section
            key="app-banner"
            aria-label={APP_BANNER_COPY.regionLabel}
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.25, ease: 'easeOut' }
            }
            className="shrink-0 overflow-hidden">
            <div className="flex items-center gap-3 bg-muted py-3 pr-2 pl-4">
              <Image
                src="/icons/icon-192.png"
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10 shrink-0 rounded-[10px]"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-sm leading-snug font-semibold text-foreground">
                  {SITE_NAME}
                </p>
                <p className="text-xs leading-snug text-foreground-secondary">
                  {APP_BANNER_VARIANT_COPY[variant].message}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isAndroidVariant(variant) ? (
                  <a
                    href={buildAppIntentUrl(pathname)}
                    aria-label={APP_BANNER_VARIANT_COPY[variant].actionLabel}
                    className={cn(
                      buttonVariants({ variant: 'primaryOutline', size: 'sm' }),
                      ACTION_BUTTON_CLASS,
                    )}
                    onClick={() => handleAction(variant)}>
                    {APP_BANNER_VARIANT_COPY[variant].action}
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant="primaryOutline"
                    size="sm"
                    className={ACTION_BUTTON_CLASS}
                    aria-label={APP_BANNER_VARIANT_COPY[variant].actionLabel}
                    onClick={() => handleAction(variant)}>
                    {APP_BANNER_VARIANT_COPY[variant].action}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={APP_BANNER_COPY.closeLabel}
                  onClick={() => handleClose(variant)}>
                  <HugeiconsIcon icon={Cancel01Icon} />
                </Button>
              </div>
            </div>
          </m.section>
        )}
      </AnimatePresence>
      <AppBannerGuideSheet
        guide={guide}
        open={isGuideOpen}
        onOpenChange={setIsGuideOpen}
      />
    </>
  );
}
