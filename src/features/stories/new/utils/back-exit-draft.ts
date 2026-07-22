import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import type {
  PendingCreationRequest,
  StoryDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';

import type { StoryCreateStep } from '../types';

export type BackExitContext = {
  /** 이탈 시점 슬롯에 저장돼 있는 레코드(없으면 null) */
  slotRecord: PendingCreationRequest | null;
  step: StoryCreateStep;
  generationRequest: GenerateSimpleStorylinesRequest | null;
  generationResult: GenerateSimpleStorylinesResponse | null;
  activeStorylineIndex: number;
  selectedStoryline: SimpleStorylineResponse | null;
  /** 직접 입력한 추가 정보 제출값 */
  additionalInfos: string[];
  /** 토글된 추천 정보 */
  selectedRecommendations: string[];
  createdStoryId: string | null;
  completionRequest: CreateSimpleStoryRequest | null;
  /** draft 레코드에 부여할 새 클라이언트 ID(순수성을 위해 주입) */
  draftRequestId: string;
};

export type BackExitOutcome =
  | { type: 'keep-in-flight' }
  | { type: 'save-draft'; record: StoryDraftRecord }
  | { type: 'discard' };

/**
 * 뒤로 가기 이탈 확정 시 복구 슬롯을 어떻게 처리할지 판정한다.
 *
 * - 슬롯에 진행 중(in-flight) 레코드가 있으면 덮어쓰지 않는다. 진행 중 요청의
 *   복구(배너·재진입 폴링)가 임시 저장보다 우선이다.
 * - 스토리라인 생성 결과가 있으면 draft로 저장한다. complete 스텝은 재개
 *   지점인 additional-info로 기록한다.
 * - 저장할 결과물이 없으면 기존처럼 버린다.
 *
 * @param context 이탈 시점의 슬롯·퍼널 상태 스냅샷
 * @returns 슬롯 처리 결과(유지·draft 저장·폐기)
 */
export function resolveBackExit(context: BackExitContext): BackExitOutcome {
  const { slotRecord } = context;

  if (
    slotRecord?.stage === 'STORYLINE_GENERATION' ||
    slotRecord?.stage === 'STORY_COMPLETION'
  ) {
    return { type: 'keep-in-flight' };
  }

  if (
    context.generationRequest === null ||
    context.generationResult === null ||
    context.step === 'keyword'
  ) {
    return { type: 'discard' };
  }

  const step =
    context.step === 'storyline-select'
      ? 'storyline-select'
      : 'additional-info';

  // additional-info 재개에는 선택된 스토리라인이 필수다. 없으면 복원할 수 없다.
  if (step === 'additional-info' && context.selectedStoryline === null) {
    return { type: 'discard' };
  }

  return {
    type: 'save-draft',
    record: {
      stage: 'STORY_DRAFT',
      requestId: context.draftRequestId,
      step,
      generationRequest: context.generationRequest,
      generationResult: context.generationResult,
      activeStorylineIndex: context.activeStorylineIndex,
      selectedStoryline: context.selectedStoryline,
      additionalInfos: context.additionalInfos,
      selectedRecommendations: context.selectedRecommendations,
      createdStoryId: context.createdStoryId,
      completionRequest: context.completionRequest,
    },
  };
}
