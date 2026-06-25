import type { StepName } from '@/lib/analytics';

import type { StoryCreateStep } from '../types';

const STEP_MAP: Record<
  StoryCreateStep,
  { step_name: StepName; step_number: number }
> = {
  keyword: { step_name: 'keyword', step_number: 1 },
  'storyline-select': { step_name: 'storylineSelect', step_number: 2 },
  'additional-info': { step_name: 'additionalInfo', step_number: 3 },
  complete: { step_name: 'complete', step_number: 4 },
};

export function mapStepToSpec(step: StoryCreateStep) {
  return STEP_MAP[step];
}
