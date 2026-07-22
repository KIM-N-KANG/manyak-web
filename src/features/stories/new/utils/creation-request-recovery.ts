import type {
  GenerateSimpleStorylinesResponse,
  SimpleStoryCreateResponse,
  StoryCreationRequestStatusResponse,
} from '@/api/generated/models';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { FetchError } from '@/lib/custom-fetch';

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

/** 성공 응답 정착 판정: 반영하거나, 레코드를 남겨 재진입 복구에 맡긴다 */
export type SuccessSettlement = 'apply' | 'defer-to-recovery';

/**
 * 원 생성 요청의 성공 응답을 어떻게 정착시킬지 판정한다.
 * 퍼널이 언마운트된 뒤 도착한 응답은 상태 반영이 불가능하므로 레코드를
 * 소비하지 않고 남겨, 홈 배너 유지·재진입 복구 조회로 결과를 되찾게 한다.
 *
 * @param isFunnelMounted 응답 도착 시점의 퍼널 마운트 여부
 * @returns 정착 방식
 */
export function resolveSuccessSettlement(
  isFunnelMounted: boolean,
): SuccessSettlement {
  return isFunnelMounted ? 'apply' : 'defer-to-recovery';
}

/** 오류 정착 판정: 레코드 폐기·보존 또는 재진입 복구 위임 */
export type ErrorSettlement =
  | 'discard-record'
  | 'keep-record'
  | 'defer-to-recovery';

/**
 * 원 생성 요청의 오류를 어떻게 정착시킬지 판정한다.
 * 언마운트 후 도착한 오류는 화면에 알릴 수 없으므로 레코드를 남겨 재진입
 * 복구 조회가 실패·완료를 판정하게 하고, 마운트 상태에서는 기존 규칙
 * (서버 응답 오류는 폐기, 네트워크 오류는 보존)을 따른다.
 *
 * @param isFunnelMounted 오류 도착 시점의 퍼널 마운트 여부
 * @param error 생성 요청 mutation이 던진 오류
 * @returns 정착 방식
 */
export function resolveErrorSettlement(
  isFunnelMounted: boolean,
  error: unknown,
): ErrorSettlement {
  if (!isFunnelMounted) {
    return 'defer-to-recovery';
  }

  return shouldKeepPendingRecordOnError(error)
    ? 'keep-record'
    : 'discard-record';
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
