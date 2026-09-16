import type { TrialsResponse, TrialUsage } from '@/api/generated/models';

/** next-auth `useSession().status` 값 — 게스트 판정에 쓴다. */
export type SessionStatus = 'authenticated' | 'loading' | 'unauthenticated';

/** 서버 체험 응답의 항목 키. */
export type TrialKind = keyof TrialsResponse;

/**
 * 체험 항목의 잔여 횟수를 계산한다. `limit`이 null이면 무제한(null)이다.
 *
 * @param usage 서버 체험 항목(없으면 undefined)
 * @returns 잔여 횟수. 항목이 없으면 undefined, 무제한이면 null
 */
export function toTrialRemaining(
  usage: TrialUsage | undefined,
): number | null | undefined {
  if (usage?.limit === undefined) {
    return undefined;
  }

  if (usage.limit === null) {
    return null;
  }

  return Math.max(usage.limit - (usage.used ?? 0), 0);
}

/**
 * 체험 응답에서 항목의 잔여 횟수를 꺼낸다.
 *
 * @param trials 서버 체험 응답(아직 없으면 undefined)
 * @param kind 체험 항목
 * @returns 잔여 횟수. 응답 전이면 undefined, 무제한이면 null
 */
export function getTrialRemaining(
  trials: TrialsResponse | undefined,
  kind: TrialKind,
): number | null | undefined {
  return toTrialRemaining(trials?.[kind]);
}

/**
 * 세션이 확정된 비인증(게스트) 상태에서 해당 체험이 소진됐는지 판정한다.
 * 'loading' 동안과 응답 전에는 소진으로 단정하지 않아 서버 402를 최종 판정으로 남긴다.
 *
 * @param status 현재 세션 상태
 * @param trials 서버 체험 응답
 * @param kind 판정할 체험 항목
 * @returns 확정된 게스트가 해당 체험을 모두 썼으면 true
 */
export function isGuestTrialExhausted(
  status: SessionStatus,
  trials: TrialsResponse | undefined,
  kind: TrialKind,
): boolean {
  return status === 'unauthenticated' && getTrialRemaining(trials, kind) === 0;
}
