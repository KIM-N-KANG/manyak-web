'use client';

import { useEffect, useRef } from 'react';

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

export function OnboardingScreen() {
  const router = useRouter();
  const gate = useOnboardingGate();
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

  if (gate !== 'eligible') {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center bg-background px-4">
        <ManyakLogo className="h-6 w-auto text-primary" />
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-col items-start gap-1 p-4">
          <h1 className="text-xl font-semibold">
            {ONBOARDING_TITLE_LINES.map((titleLine) => (
              <span key={titleLine} className="block">
                {titleLine}
              </span>
            ))}
          </h1>
          <p className="text-foreground-secondary">{ONBOARDING_DESCRIPTION}</p>
        </div>

        <OnboardingPreview />
      </main>

      <nav className="flex w-full shrink-0 items-center gap-2 bg-background px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] [&>button]:flex-1">
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
      </nav>
    </div>
  );
}
