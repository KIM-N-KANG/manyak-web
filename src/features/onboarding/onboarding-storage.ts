import { onboardingStorageKey, type OnboardingTourName } from './constants';

const SEEN_VALUE = '1';

export function parseOnboardingSeen(value: string | null): boolean {
  return value === SEEN_VALUE;
}

/**
 * 서버 렌더링 시점에는 localStorage가 없으므로 "봤음(true)"으로 간주해
 * 서버에서 투어가 자동 시작되지 않도록 한다.
 */
export function isTourSeen(tour: OnboardingTourName): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  return parseOnboardingSeen(
    window.localStorage.getItem(onboardingStorageKey(tour)),
  );
}

export function markTourSeen(tour: OnboardingTourName): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(onboardingStorageKey(tour), SEEN_VALUE);
}
