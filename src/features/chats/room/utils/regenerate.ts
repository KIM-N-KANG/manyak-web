import type { ChatTurnResponse } from '@/api/generated/models';
import { FetchError } from '@/lib/api-error';

/**
 * 턴이 재생성 가능한지 판정한다.
 * 마지막 턴 여부는 호출부(렌더 컨텍스트)가 판단하고, 여기서는 턴 자체 조건만 본다:
 * turnId가 있어야 하고, 대체할 AI 출력이 있어야 하며, 엔딩 도달 턴은 서버가 409로 거절한다.
 *
 * @param turn 재생성 가능 여부를 판정할 턴
 * @returns 턴이 재생성 가능하면 true
 */
export function canRegenerate(turn: ChatTurnResponse): boolean {
  return turn.id != null && !!turn.aiOutput && turn.reachedEnding == null;
}

/**
 * 재생성 요청이 409(이미 새 턴이 추가된 낡은 화면)로 거절됐는지 판정한다.
 * 이 경우 기존 본문 복원 대신 상세 refetch로 최신 상태를 반영한다(스펙 §3-6).
 *
 * @param error 판정할 에러 객체
 * @returns 에러가 409 낡은 턴 에러이면 true
 */
export function isStaleTurnError(error: unknown): boolean {
  return error instanceof FetchError && error.status === 409;
}
