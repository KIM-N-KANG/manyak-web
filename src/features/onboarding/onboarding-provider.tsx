'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';
import { Onborda, OnbordaProvider, useOnborda } from 'onborda';

import type { OnboardingTourName } from './constants';
import { OnboardingCard } from './onboarding-card';
import { markTourSeen } from './onboarding-storage';
import { onboardingTours } from './onboarding-tours';

/**
 * 라우트가 바뀌면 진행 중인 투어를 닫는다.
 * (홈에서 만들기 버튼 클릭 → 제작 페이지 이동처럼, 타깃이 사라지는 화면 전환에서
 *  깨진 오버레이가 남지 않도록 하고, 닫힘 감지(markSeen)를 트리거한다.)
 */
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

/**
 * 투어가 닫힐 때(완료·건너뛰기·라우트 전환) 해당 투어를 "봤음"으로 기록한다.
 */
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
        shadowRgb="0,0,0"
        shadowOpacity="0.6">
        <CloseOnRouteChange />
        <MarkSeenOnClose />
        {children}
      </Onborda>
    </OnbordaProvider>
  );
}
