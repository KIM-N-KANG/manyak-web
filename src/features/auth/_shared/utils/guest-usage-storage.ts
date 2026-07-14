import { GUEST_LIMITS } from '@/features/onboarding/constants';
import {
  getCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
} from '@/features/stories/_shared/utils/story-id-storage';

/** 게스트 누적 사용량을 보관하는 로컬스토리지 키 */
export const GUEST_USAGE_STORAGE_KEY = 'manyak:guest-usage';

export type GuestUsageAction = keyof typeof GUEST_LIMITS;

export type GuestUsage = Record<GuestUsageAction, number>;

const EMPTY_USAGE: GuestUsage = {
  storylineCreate: 0,
  storyCreate: 0,
  chat: 0,
};

/**
 * 0 이상 정수만 유효한 카운트로 본다. 그 외(음수·NaN·비숫자)는 0.
 *
 * @param value 카운트로 변환할 임의의 값
 * @returns 0 이상의 정수 카운트
 */
function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/**
 * 저장된 원본 문자열을 사용량 객체로 파싱한다. 파싱 실패·누락은 0으로 보정.
 *
 * @param raw 로컬스토리지에 저장된 원본 문자열(없으면 null)
 * @returns 파싱된 게스트 사용량 객체
 */
export function parseGuestUsage(raw: string | null): GuestUsage {
  if (!raw) {
    return { ...EMPTY_USAGE };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { ...EMPTY_USAGE };
    }

    const record = parsed as Record<string, unknown>;

    return {
      storylineCreate: toCount(record.storylineCreate),
      storyCreate: toCount(record.storyCreate),
      chat: toCount(record.chat),
    };
  } catch {
    return { ...EMPTY_USAGE };
  }
}

/**
 * 카운터 도입 전 게스트 보정: 이미 스토리를 만든 기기가 공짜 2번째를 얻지 않도록
 * storyCreate를 저장된 스토리 ID 개수까지 끌어올린다.
 *
 * @param usage 기존 게스트 사용량
 * @param storyIdCount 저장된 스토리 ID 개수
 * @returns storyCreate를 보정한 게스트 사용량
 */
export function seedGuestUsage(
  usage: GuestUsage,
  storyIdCount: number,
): GuestUsage {
  return {
    ...usage,
    storyCreate: Math.max(usage.storyCreate, storyIdCount),
  };
}

/**
 * 해당 액션이 게스트 한도에 도달했는지 판정한다.
 *
 * @param action 판정할 게스트 액션
 * @param usage 현재 게스트 사용량
 * @returns 한도에 도달했으면 true
 */
export function isLimitReached(
  action: GuestUsageAction,
  usage: GuestUsage,
): boolean {
  return usage[action] >= GUEST_LIMITS[action];
}

/**
 * 현재 게스트 사용량을 읽는다. SSR·localStorage 차단 시 전부 0.
 * storyCreate는 스토리 ID 목록 길이로 시드한다.
 *
 * @returns 시드가 반영된 현재 게스트 사용량
 */
export function readGuestUsage(): GuestUsage {
  if (typeof window === 'undefined') {
    return { ...EMPTY_USAGE };
  }

  try {
    const parsed = parseGuestUsage(
      window.localStorage.getItem(GUEST_USAGE_STORAGE_KEY),
    );
    const storyIdCount = parseCreatedStoryIds(
      getCreatedStoryIdsSnapshot(),
    ).length;

    return seedGuestUsage(parsed, storyIdCount);
  } catch {
    return { ...EMPTY_USAGE };
  }
}

/**
 * 해당 액션의 누적 카운터를 +1 한다. localStorage 차단 시 조용히 무시.
 *
 * @param action 카운터를 증가시킬 게스트 액션
 */
export function incrementGuestUsage(action: GuestUsageAction): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const current = readGuestUsage();
    const next: GuestUsage = { ...current, [action]: current[action] + 1 };

    window.localStorage.setItem(GUEST_USAGE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }
}

/**
 * 현재 저장된 사용량 기준으로 해당 액션이 한도에 도달했는지 반환한다.
 *
 * @param action 판정할 게스트 액션
 * @returns 한도에 도달했으면 true
 */
export function isGuestUsageLimitReached(action: GuestUsageAction): boolean {
  return isLimitReached(action, readGuestUsage());
}

/**
 * 저장된 게스트 사용량 카운터를 제거한다. 로그인·이관 후 스테일 카운터로 인한
 * 오게이팅(이미 인증된 기기가 게스트 한도로 판정되는 문제)을 막는다.
 * localStorage 차단 시 조용히 무시.
 */
export function clearGuestUsage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(GUEST_USAGE_STORAGE_KEY);
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 건너뛴다.
  }
}

/** next-auth `useSession().status` 값 — 게스트 판정에 쓴다. */
export type SessionStatus = 'authenticated' | 'loading' | 'unauthenticated';

/**
 * 세션이 확정된 비인증(게스트) 상태에서만 해당 액션의 한도 초과를 판정한다.
 * 'loading' 동안은 게스트로 단정하지 않아, 세션 확정 전 인증 사용자에게
 * 로그인 유도가 잘못 뜨는 것을 막는다.
 *
 * @param status 현재 세션 상태
 * @param action 판정할 게스트 액션
 * @returns 확정된 비인증 상태에서 한도를 초과했으면 true
 */
export function isGuestOverLimit(
  status: SessionStatus,
  action: GuestUsageAction,
): boolean {
  return status === 'unauthenticated' && isGuestUsageLimitReached(action);
}
