import type {
  GenerateSimpleStorylinesResponse,
  SimpleStoryCreateResponse,
  StoryCreationRequestStatusResponse,
} from '@/api/generated/models';
import { FetchError } from '@/lib/custom-fetch';

import type { PendingCreationRequest } from './creation-request-storage';

/**
 * 생성 요청 실패 시 복구 레코드를 보존할지 판정한다.
 * 서버가 상태 코드를 응답한 HTTP 오류(FetchError)는 결과가 확정된 것이므로 지우고,
 * 응답 자체를 받지 못한 네트워크 오류(백그라운드 전환·타임아웃 등)는 보존해
 * 복귀 시 복구 조회로 결과를 되찾는다.
 *
 * @param error 생성 요청 mutation이 던진 오류
 * @returns 레코드를 보존해야 하면 true
 */
export function shouldKeepPendingRecordOnError(error: unknown): boolean {
  return !(error instanceof FetchError);
}

/** 복구 조회 응답을 화면 반영 액션으로 옮긴 판정 결과 */
export type CreationRecoveryAction =
  | { type: 'pending' }
  | { type: 'storylines-completed'; result: GenerateSimpleStorylinesResponse }
  | { type: 'story-completed'; result: SimpleStoryCreateResponse }
  | { type: 'failed' };

/**
 * 복구 조회 응답을 단계에 맞는 복원 액션으로 변환한다.
 * COMPLETED의 result는 원 POST 응답과 동일 스키마이지만 orval이 JsonNode로
 * 생성하므로 여기서 단계 기준으로 타입을 확정한다. COMPLETED인데 result가
 * 없거나 status를 알 수 없으면 방어적으로 실패로 합류한다.
 *
 * @param stage 저장해 둔 복구 레코드의 생성 단계
 * @param response 복구 조회 응답
 * @returns 화면 복원 액션
 */
export function resolveCreationRecovery(
  stage: PendingCreationRequest['stage'],
  response: StoryCreationRequestStatusResponse,
): CreationRecoveryAction {
  if (response.status === 'PENDING') {
    return { type: 'pending' };
  }

  if (response.status === 'COMPLETED' && response.result) {
    if (stage === 'STORYLINE_GENERATION') {
      return {
        type: 'storylines-completed',
        result: response.result as GenerateSimpleStorylinesResponse,
      };
    }

    return {
      type: 'story-completed',
      result: response.result as SimpleStoryCreateResponse,
    };
  }

  return { type: 'failed' };
}
