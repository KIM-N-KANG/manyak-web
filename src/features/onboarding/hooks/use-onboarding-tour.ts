'use client';

import { useEffect, useRef } from 'react';

import { useOnborda } from 'onborda';

import { type OnboardingTourName } from '../constants';
import { shouldAutoStartTour } from '../utils/onboarding-policy';
import { isTourSeen } from '../utils/onboarding-storage';

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
