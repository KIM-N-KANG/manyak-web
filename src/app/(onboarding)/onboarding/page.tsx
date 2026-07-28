import { Suspense } from 'react';

import type { Metadata } from 'next';

import { OnboardingScreen } from '@/features/onboarding/components/onboarding-screen';

/**
 * 온보딩은 신규 방문자용 퍼널 페이지다. 대표 URL은 홈이므로 색인에서 제외한다.
 * robots.txt로 크롤 자체를 막으면 크롤러가 이 메타를 못 읽어 기존 색인이
 * 남으므로, 크롤은 허용하고 페이지에서 noindex를 선언한다.
 */
export const metadata: Metadata = {
  robots: { index: false },
};

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingScreen />
    </Suspense>
  );
}
