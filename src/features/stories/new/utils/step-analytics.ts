import type { StepName } from '@/observability/analytics';

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

/**
 * 스토리 생성 스텝을 분석 이벤트용 스텝 이름/번호 속성으로 변환한다.
 *
 * @param step 변환할 스토리 생성 스텝
 * @returns 분석 이벤트용 스텝 이름과 번호 속성
 */
export function mapStepToSpec(step: StoryCreateStep) {
  return STEP_MAP[step];
}
