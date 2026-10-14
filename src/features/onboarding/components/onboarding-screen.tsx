'use client';

import { useEffect, useRef } from 'react';

import { m, useReducedMotion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH, type MainAppPath } from '@/constants/app-path';
import { track } from '@/observability/analytics';

import {
  ONBOARDING_BROWSE_LABEL,
  ONBOARDING_FEATURES,
  ONBOARDING_START_LABEL,
  type OnboardingButtonSource,
} from '../constants';
import { useOnboardingGate } from '../hooks/use-onboarding-gate';
import {
  createRiseVariants,
  ONBOARDING_ENTRANCE_DELAY,
} from '../utils/onboarding-motion';
import {
  markOnboardingSeen,
  setOnboardingSeenCookie,
} from '../utils/onboarding-storage';
import { OnboardingFeature } from './onboarding-feature';
import { OnboardingFooter } from './onboarding-footer';
import { OnboardingHero } from './onboarding-hero';

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
  const scrollerRef = useRef<HTMLElement>(null);

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

  const handleStartCreate = (source: OnboardingButtonSource) => {
    hasChosenRef.current = true;
    markOnboardingSeen();
    track('client_onboarding_createButton_clicked', source);
    router.replace(APP_PATH.STUDIO.STORY.SIMPLE);
  };

  const handleScrollToTop = () => {
    scrollerRef.current?.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const handleBrowse = (source: OnboardingButtonSource) => {
    hasChosenRef.current = true;
    markOnboardingSeen();
    track('client_onboarding_browseButton_clicked', source);
    router.replace(APP_PATH.MAIN.STORIES);
  };

  const rise = createRiseVariants(prefersReducedMotion);

  if (gate !== 'eligible') {
    return null;
  }

  return (
    <m.div
      initial="hidden"
      animate="show"
      className="flex h-full min-h-0 flex-col break-keep">
      <header className="flex h-14 shrink-0 items-center justify-between bg-background px-4">
        <button
          type="button"
          aria-label="맨 위로 이동"
          onClick={handleScrollToTop}>
          <ManyakLogo className="h-6 w-auto text-primary" />
        </button>
        <m.div
          variants={rise}
          custom={ONBOARDING_ENTRANCE_DELAY.headerActions}
          className="flex items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleBrowse({ source: 'header' })}>
            {ONBOARDING_BROWSE_LABEL}
          </Button>
          <Button
            type="button"
            onClick={() => handleStartCreate({ source: 'header' })}>
            {ONBOARDING_START_LABEL}
          </Button>
        </m.div>
      </header>
      <main
        ref={scrollerRef}
        className="[container-type:size] min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <OnboardingHero scrollerRef={scrollerRef} />
        {ONBOARDING_FEATURES.map((feature, index) => (
          <OnboardingFeature
            key={feature.key}
            feature={feature}
            scrollerRef={scrollerRef}
            showGenreCloud={index === 0}
            onAction={() => {
              const source = {
                source: 'section',
                section: feature.key,
              } as const;

              if (feature.action.type === 'create') {
                handleStartCreate(source);
              } else {
                handleBrowse(source);
              }
            }}
          />
        ))}
        <OnboardingFooter />
      </main>
    </m.div>
  );
}
