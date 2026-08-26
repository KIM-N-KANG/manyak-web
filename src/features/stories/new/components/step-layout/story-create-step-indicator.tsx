import { cn } from '@/lib/utils';

import {
  STORY_CREATE_INDICATOR_STEPS,
  STORY_CREATE_STEP_ORDER,
} from '../../constants';
import type { StoryCreateStep } from '../../types';

type StoryCreateStepIndicatorProps = {
  step: StoryCreateStep;
};

export function StoryCreateStepIndicator({
  step,
}: StoryCreateStepIndicatorProps) {
  const currentIndex = STORY_CREATE_STEP_ORDER.indexOf(step);

  return (
    <ol className="flex gap-3">
      {STORY_CREATE_INDICATOR_STEPS.map((item, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={item.step}
            className="flex-1"
            aria-current={isCurrent ? 'step' : undefined}>
            <span
              aria-hidden="true"
              className={cn(
                'block h-0.75 rounded-full transition-colors',
                isCompleted &&
                  'bg-foreground-secondary/65 dark:bg-foreground-secondary/55',
                isCurrent && 'bg-foreground-secondary/60',
                !isCompleted && !isCurrent && 'bg-border',
              )}
            />
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
