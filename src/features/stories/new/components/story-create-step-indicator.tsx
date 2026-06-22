import { Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { cn } from '@/lib/utils';

import {
  STORY_CREATE_INDICATOR_STEPS,
  STORY_CREATE_STEP_ORDER,
} from '../constants';
import type { StoryCreateStep } from '../types';

// 양 끝 동그라미(size-4)는 좌우에 붙고 가운데 동그라미는 중앙에 오므로,
// 각 연결선은 동그라미 반지름(8px = left-2/right-2)만큼 띄워 중심끼리 잇는다.
const STEP_CONNECTORS = [
  { className: 'left-2 right-1/2', reachedIndex: 1 },
  { className: 'left-1/2 right-2', reachedIndex: 2 },
] as const;

type StoryCreateStepIndicatorProps = {
  step: StoryCreateStep;
};

export function StoryCreateStepIndicator({
  step,
}: StoryCreateStepIndicatorProps) {
  const currentIndex = STORY_CREATE_STEP_ORDER.indexOf(step);

  return (
    <ol className="relative flex justify-between">
      {STEP_CONNECTORS.map((connector) => (
        <span
          key={connector.className}
          aria-hidden="true"
          className={cn(
            'absolute top-1.75 h-0.5 transition-colors',
            connector.className,
            currentIndex >= connector.reachedIndex ? 'bg-primary' : 'bg-border',
          )}
        />
      ))}

      {STORY_CREATE_INDICATOR_STEPS.map((item, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={item.step}
            className="relative z-10"
            aria-current={isCurrent ? 'step' : undefined}>
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full text-[10px] font-semibold transition-colors',
                isCompleted && 'bg-primary text-primary-foreground',
                isCurrent && 'border-2 border-primary bg-background',
                !isCompleted &&
                  !isCurrent &&
                  'bg-muted text-foreground-secondary',
              )}>
              {isCompleted ? (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={11}
                  strokeWidth={3}
                  aria-hidden="true"
                />
              ) : isCurrent ? null : (
                <span aria-hidden="true">{index + 1}</span>
              )}
            </span>
            <span className="sr-only">
              {item.label}
              {isCompleted ? ' (완료)' : isCurrent ? ' (현재 단계)' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
