'use client';

import { useEffect, useRef } from 'react';

import { m, useReducedMotion, type Variants } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH, type MainAppPath } from '@/constants/app-path';
import { track } from '@/observability/analytics';

import { ONBOARDING_DESCRIPTION, ONBOARDING_TITLE_LINES } from '../constants';
import { useOnboardingGate } from '../hooks/use-onboarding-gate';
import {
  markOnboardingSeen,
  setOnboardingSeenCookie,
} from '../utils/onboarding-storage';
import { OnboardingLanding } from './onboarding-landing';

// 위에서 아래로 읽는 순서를 따라가는 등장 시점(초). 타이틀 두 줄은
// 소설 도입부처럼 반 박자 간격을 두고, CTA가 마지막에 나타난다.
const ENTRANCE_DELAY = {
  titleSecondLine: 0.25,
  description: 0.45,
  buttons: 0.65,
} as const;

// 초반에 빠르게 감속한 뒤 긴 꼬리로 잦아드는 커브. 기본 easeOut보다
// 멈추는 순간이 드러나지 않아 등장이 우아하게 느껴진다.
const ENTRANCE_EASE = [0.22, 1, 0.36, 1] as const;

const MAIN_PATHS = new Set<string>(Object.values(APP_PATH.MAIN));

/**
 * proxy가 넘긴 원래 목적지(`from`)를 되돌아갈 경로로 검증한다.
 * 메인 탭 경로만 허용해 임의 값으로의 이동을 막는다.
 *
 * @param from `from` 쿼리 값(없으면 null)
 * @returns 되돌아갈 메인 탭 경로(기본값 홈)
 */
function resolveReturnPath(from: string | null): MainAppPath {
  return from !== null && MAIN_PATHS.has(from)
    ? (from as MainAppPath)
    : APP_PATH.MAIN.STORIES;
}

export function OnboardingScreen() {
  const router = useRouter();
  const gate = useOnboardingGate();
  const prefersReducedMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const returnPath = resolveReturnPath(searchParams.get('from'));
  const hasChosenRef = useRef(false);
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (hasChosenRef.current || gate === 'pending') {
      return;
    }

    if (gate === 'ineligible') {
      setOnboardingSeenCookie();
      router.replace(returnPath);

      return;
    }

    if (!hasTrackedViewRef.current) {
      hasTrackedViewRef.current = true;
      track('client_onboarding_viewed');
    }
  }, [gate, returnPath, router]);

  const handleStartCreate = () => {
    hasChosenRef.current = true;
    markOnboardingSeen();
    track('client_onboarding_createButton_clicked');
    router.replace(APP_PATH.STUDIO.STORY.SIMPLE);
  };

  const handleGoHome = () => {
    hasChosenRef.current = true;
    markOnboardingSeen();
    track('client_onboarding_logo_clicked');
    router.replace(APP_PATH.MAIN.STORIES);
  };

  const rise: Variants = {
    hidden: {
      opacity: 0,
      ...(prefersReducedMotion ? {} : { y: 18, filter: 'blur(5px)' }),
    },
    show: (delay: number) => ({
      opacity: 1,
      ...(prefersReducedMotion ? {} : { y: 0, filter: 'blur(0px)' }),
      transition: { delay, duration: 0.6, ease: ENTRANCE_EASE },
    }),
  };

  if (gate !== 'eligible') {
    return null;
  }

  return (
    <m.div
      initial="hidden"
      animate="show"
      className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center bg-background px-4">
        <button type="button" aria-label="홈으로 이동" onClick={handleGoHome}>
          <ManyakLogo className="h-6 w-auto text-primary" />
        </button>
      </header>
      <main className="min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-start gap-1 p-4">
          <h1 className="text-xl font-semibold">
            {ONBOARDING_TITLE_LINES.map((titleLine, index) => (
              <m.span
                key={titleLine}
                variants={rise}
                custom={index === 0 ? 0 : ENTRANCE_DELAY.titleSecondLine}
                className="block">
                {titleLine}
              </m.span>
            ))}
          </h1>
          <m.p
            variants={rise}
            custom={ENTRANCE_DELAY.description}
            className="text-foreground-secondary">
            {ONBOARDING_DESCRIPTION}
          </m.p>
        </div>

        <OnboardingLanding />
      </main>

      <m.nav
        variants={rise}
        custom={ENTRANCE_DELAY.buttons}
        className="flex w-full shrink-0 items-center bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          type="button"
          size="lg"
          className="flex-1"
          onClick={handleStartCreate}>
          첫 장면 만들기
        </Button>
      </m.nav>
    </m.div>
  );
}
