'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';
import { Onborda, OnbordaProvider, useOnborda } from 'onborda';

import { markTourSeen } from '@/features/onboarding/utils/onboarding-storage';
import { onboardingTours } from '@/features/onboarding/utils/onboarding-tours';

import { OnboardingCard } from '../../features/onboarding/components/onboarding-card';
import type { OnboardingTourName } from '../../features/onboarding/constants';

function CloseOnRouteChange() {
  const pathname = usePathname();
  const { closeOnborda, isOnbordaVisible } = useOnborda();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;

    if (isOnbordaVisible) {
      closeOnborda();
    }
  }, [pathname, isOnbordaVisible, closeOnborda]);

  return null;
}

function MarkSeenOnClose() {
  const { currentTour, isOnbordaVisible } = useOnborda();
  const activeTourRef = useRef<OnboardingTourName | null>(null);

  useEffect(() => {
    if (isOnbordaVisible && currentTour) {
      activeTourRef.current = currentTour as OnboardingTourName;

      return;
    }

    if (!isOnbordaVisible && activeTourRef.current) {
      markTourSeen(activeTourRef.current);
      activeTourRef.current = null;
    }
  }, [currentTour, isOnbordaVisible]);

  return null;
}

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnbordaProvider>
      <Onborda
        steps={onboardingTours}
        cardComponent={OnboardingCard}
        shadowRgb="31,31,31"
        shadowOpacity="0.6">
        <CloseOnRouteChange />
        <MarkSeenOnClose />
        {children}
      </Onborda>
    </OnbordaProvider>
  );
}
