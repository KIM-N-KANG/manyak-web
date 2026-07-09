import { GUEST_LIMITS } from '@/features/onboarding/constants';
import {
  getCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
} from '@/features/stories/list/utils/story-id-storage';

/** 게스트 누적 사용량을 보관하는 로컬스토리지 키 */
export const GUEST_USAGE_STORAGE_KEY = 'manyak:guest-usage';

export type GuestUsageAction = keyof typeof GUEST_LIMITS;

export type GuestUsage = Record<GuestUsageAction, number>;

const EMPTY_USAGE: GuestUsage = {
  storylineCreate: 0,
  storyCreate: 0,
  chat: 0,
};

/** 0 이상 정수만 유효한 카운트로 본다. 그 외(음수·NaN·비숫자)는 0. */
function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/** 저장된 원본 문자열을 사용량 객체로 파싱한다. 파싱 실패·누락은 0으로 보정. */
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

/** 해당 액션이 게스트 한도에 도달했는지 판정한다. */
export function isLimitReached(
  action: GuestUsageAction,
  usage: GuestUsage,
): boolean {
  return usage[action] >= GUEST_LIMITS[action];
}

/**
 * 현재 게스트 사용량을 읽는다. SSR·localStorage 차단 시 전부 0.
 * storyCreate는 스토리 ID 목록 길이로 시드한다.
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

/** 해당 액션의 누적 카운터를 +1 한다. localStorage 차단 시 조용히 무시. */
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

/** 현재 저장된 사용량 기준으로 해당 액션이 한도에 도달했는지 반환한다. */
export function isGuestUsageLimitReached(action: GuestUsageAction): boolean {
  return isLimitReached(action, readGuestUsage());
}
