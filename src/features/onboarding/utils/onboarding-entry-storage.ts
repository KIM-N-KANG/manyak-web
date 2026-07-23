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
 * 온보딩을 거쳐 스토리 생성에 진입했는지 읽는다.
 * 렌더 중에도 안전하도록 읽기만 하고 지우지는 않는다. 소비는
 * `clearOnboardingEntry`가 담당한다.
 *
 * @returns 온보딩을 거쳐 진입했으면 true
 */
export function isOnboardingEntry(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return (
      window.sessionStorage.getItem(ONBOARDING_ENTRY_STORAGE_KEY) ===
      ONBOARDING_ENTRY_VALUE
    );
  } catch {
    return false;
  }
}

/**
 * 온보딩 진입 기록을 지운다.
 * 한 번의 퍼널 진입에만 적용되어야 하므로 진입 화면이 마운트되면 소비한다.
 */
export function clearOnboardingEntry(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(ONBOARDING_ENTRY_STORAGE_KEY);
  } catch {
    // 프라이빗 모드 등 sessionStorage 차단 환경에서는 삭제를 건너뛴다.
  }
}
