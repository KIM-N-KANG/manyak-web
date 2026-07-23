'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';

import { useOnboardingGate } from '../hooks/use-onboarding-gate';

export function OnboardingRedirect() {
  const router = useRouter();
  const gate = useOnboardingGate();

  useEffect(() => {
    if (gate !== 'eligible') {
      return;
    }

    router.replace(APP_PATH.ONBOARDING);
  }, [gate, router]);

  return null;
}
