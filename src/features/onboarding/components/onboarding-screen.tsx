'use client';

import { useEffect, useRef } from 'react';

import { m, useReducedMotion, type Variants } from 'motion/react';
import { useRouter } from 'next/navigation';

import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { track } from '@/observability/analytics';

import { ONBOARDING_DESCRIPTION, ONBOARDING_TITLE_LINES } from '../constants';
import { useOnboardingGate } from '../hooks/use-onboarding-gate';
import { markOnboardingEntry } from '../utils/onboarding-entry-storage';
import { markOnboardingSeen } from '../utils/onboarding-storage';
import { OnboardingPreview } from './onboarding-preview';

// 위에서 아래로 읽는 순서를 따라가는 등장 시점(초). 타이틀 두 줄은
// 소설 도입부처럼 반 박자 간격을 두고, CTA가 마지막에 나타난다.
const ENTRANCE_DELAY = {
  titleSecondLine: 0.35,
  description: 0.55,
  preview: 0.7,
  buttons: 0.85,
} as const;

export function OnboardingScreen() {
  const router = useRouter();
  const gate = useOnboardingGate();
  const prefersReducedMotion = useReducedMotion();
  const hasChosenRef = useRef(false);
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (hasChosenRef.current || gate === 'pending') {
      return;
    }

    if (gate === 'ineligible') {
      router.replace(APP_PATH.MAIN.STORIES);

      return;
    }

    if (!hasTrackedViewRef.current) {
      hasTrackedViewRef.current = true;
      track('client_onboarding_viewed');
    }
  }, [gate, router]);

  const handleStartCreate = () => {
    hasChosenRef.current = true;
    markOnboardingSeen();
    markOnboardingEntry();
    track('client_onboarding_createButton_clicked');
    router.replace(APP_PATH.CREATOR.STORY);
  };

  const handleSkip = () => {
    hasChosenRef.current = true;
    markOnboardingSeen();
    track('client_onboarding_skipButton_clicked');
    router.replace(APP_PATH.MAIN.STORIES);
  };

  const rise: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 12 },
    show: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay, duration: 0.3, ease: 'easeOut' },
    }),
  };

  const previewRise: Variants = {
    hidden: { opacity: 0, scale: prefersReducedMotion ? 1 : 0.97 },
    show: (delay: number) => ({
      opacity: 1,
      scale: 1,
      transition: { delay, duration: 0.35, ease: 'easeOut' },
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
        <ManyakLogo className="h-6 w-auto text-primary" />
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col items-start gap-1 p-4">
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

        <m.div
          variants={previewRise}
          custom={ENTRANCE_DELAY.preview}
          className="flex min-h-0 flex-1">
          <OnboardingPreview />
        </m.div>
      </main>

      <m.nav
        variants={rise}
        custom={ENTRANCE_DELAY.buttons}
        className="flex w-full shrink-0 items-center gap-2 bg-background px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] [&>button]:flex-1">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          onClick={handleSkip}>
          나중에 하기
        </Button>
        <Button type="button" size="lg" onClick={handleStartCreate}>
          첫 장면 만들기
        </Button>
      </m.nav>
    </m.div>
  );
}
