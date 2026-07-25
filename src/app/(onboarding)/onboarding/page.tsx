import { Suspense } from 'react';

import { OnboardingScreen } from '@/features/onboarding/components/onboarding-screen';

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingScreen />
    </Suspense>
  );
}
