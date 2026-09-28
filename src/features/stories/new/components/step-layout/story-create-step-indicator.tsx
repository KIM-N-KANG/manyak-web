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
              className="block h-1 overflow-hidden rounded-full bg-border">
              <span
                className={cn(
                  'block h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none',
                  isCompleted &&
                    'w-full bg-foreground-secondary/65 dark:bg-foreground-secondary/55',
                  isCurrent && 'w-full bg-foreground-secondary/60',
                  !isCompleted && !isCurrent && 'w-0',
                )}
              />
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
