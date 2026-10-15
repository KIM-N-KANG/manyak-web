'use client';

import { useEffect, useRef } from 'react';

import { m, useReducedMotion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';

import { APP_PATH, type MainAppPath } from '@/constants/app-path';
import { track } from '@/observability/analytics';

import { ONBOARDING_FEATURES, type OnboardingButtonSource } from '../constants';
import { useOnboardingGate } from '../hooks/use-onboarding-gate';
import {
  markOnboardingSeen,
  setOnboardingSeenCookie,
} from '../utils/onboarding-storage';
import { OnboardingFeature } from './onboarding-feature';
import { OnboardingFooter } from './onboarding-footer';
import { OnboardingHeader } from './onboarding-header';
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
  const heroRef = useRef<HTMLElement>(null);

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

  if (gate !== 'eligible') {
    return null;
  }

  return (
    <m.div
      initial="hidden"
      animate="show"
      className="relative flex h-full min-h-0 flex-col break-keep [--onboarding-header-height:3.5rem]">
      <OnboardingHeader
        scrollerRef={scrollerRef}
        heroRef={heroRef}
        onLogoClick={handleScrollToTop}
      />
      <main
        ref={scrollerRef}
        className="[container-type:size] relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <OnboardingHero scrollerRef={scrollerRef} sectionRef={heroRef} />
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
