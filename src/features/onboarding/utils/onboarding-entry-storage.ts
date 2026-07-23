import {
  ONBOARDING_ENTRY_STORAGE_KEY,
  ONBOARDING_ENTRY_VALUE,
} from '../constants';

/**
 * 온보딩에서 스토리 생성으로 이동했음을 세션에 기록한다.
 * 온보딩은 `replace`로 이동하므로 퍼널에는 돌아갈 앱 내 히스토리가 없다.
 */
export function markOnboardingEntry(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      ONBOARDING_ENTRY_STORAGE_KEY,
      ONBOARDING_ENTRY_VALUE,
    );
  } catch {
    // 프라이빗 모드 등 sessionStorage 차단 환경에서는 저장을 건너뛴다.
  }
}

/**
 * 온보딩 진입 기록을 읽고 즉시 지운다.
 * 한 번의 퍼널 진입에만 적용되어야 하므로 읽는 시점에 소비한다.
 *
 * @returns 온보딩을 거쳐 진입했으면 true
 */
export function consumeOnboardingEntry(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const value = window.sessionStorage.getItem(ONBOARDING_ENTRY_STORAGE_KEY);

    window.sessionStorage.removeItem(ONBOARDING_ENTRY_STORAGE_KEY);

    return value === ONBOARDING_ENTRY_VALUE;
  } catch {
    return false;
  }
}
