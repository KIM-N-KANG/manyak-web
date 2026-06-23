'use client';

import { useEffect, useRef } from 'react';

import { useOnborda } from 'onborda';

import type { OnboardingTourName } from './constants';
import { shouldAutoStartTour } from './onboarding-policy';
import { isTourSeen } from './onboarding-storage';

/**
 * 페이지 첫 방문 시 해당 투어를 1회 자동 시작한다.
 * targetReady: 투어 첫 스텝의 타깃 요소가 DOM에 마운트됐는지 여부.
 */
export function useStartOnboarding(
  tour: OnboardingTourName,
  targetReady: boolean,
): void {
  const { startOnborda } = useOnborda();
  const startedRef = useRef(false);

  useEffect(() => {
    const willStart = shouldAutoStartTour({
      seen: isTourSeen(tour),
      targetReady,
      alreadyStarted: startedRef.current,
    });

    if (!willStart) {
      return;
    }

    startedRef.current = true;
    startOnborda(tour);
  }, [tour, targetReady, startOnborda]);
}
