'use client';

import { useEffect } from 'react';

import type { CardComponentProps } from 'onborda';
import { useOnborda } from 'onborda';

import { Button } from '@/components/ui/button';
import { ONBOARDING_TOURS } from '@/features/onboarding/constants';
import { track } from '@/lib/analytics';

export function OnboardingCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  arrow,
}: CardComponentProps) {
  const { closeOnborda, currentTour } = useOnborda();
  const isLastStep = currentStep + 1 >= totalSteps;
  const hasNextControl = step.showControls !== false;
  const isEntryTour = currentTour === ONBOARDING_TOURS.STORY_LIST;

  useEffect(() => {
    if (isEntryTour && currentStep === 0) {
      track('client_onboarding_viewed', { step_number: 1 });
    }
  }, [isEntryTour, currentStep]);

  return (
    <div className="w-76 max-w-[80vw] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{step.title}</h2>
        {totalSteps > 1 && (
          <span className="shrink-0 text-xs text-foreground-secondary">
            {currentStep + 1}/{totalSteps}
          </span>
        )}
      </div>

      <div className="mt-2 text-sm leading-relaxed text-foreground-secondary">
        {step.content}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (isEntryTour) {
              track('client_onboarding_skipButton_clicked', {
                step_number: currentStep + 1,
              });
            }

            closeOnborda();
          }}>
          건너뛰기
        </Button>
        {hasNextControl ? (
          <Button
            size="sm"
            onClick={isLastStep ? () => closeOnborda() : () => nextStep()}>
            {isLastStep ? '완료' : '다음'}
          </Button>
        ) : (
          <span className="text-xs text-foreground-secondary">
            버튼을 눌러 계속하세요
          </span>
        )}
      </div>

      <span className="text-popover">{arrow}</span>
    </div>
  );
}
