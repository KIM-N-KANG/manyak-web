'use client';

import type { CardComponentProps } from 'onborda';
import { useOnborda } from 'onborda';

import { Button } from '@/components/ui/button';

export function OnboardingCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  arrow,
}: CardComponentProps) {
  const { closeOnborda } = useOnborda();
  const isLastStep = currentStep + 1 >= totalSteps;
  const hasNextControl = step.showControls !== false;

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
        <Button variant="secondary" size="sm" onClick={() => closeOnborda()}>
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
