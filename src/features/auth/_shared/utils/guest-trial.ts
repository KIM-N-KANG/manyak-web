import type { TrialsResponse, TrialUsage } from '@/api/generated/models';

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
