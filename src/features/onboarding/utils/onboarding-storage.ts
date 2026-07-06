import {
  ONBOARDING_SEEN_STORAGE_KEY,
  ONBOARDING_SEEN_VALUE,
} from '../constants';

/** 로컬스토리지에 저장된 값이 온보딩을 본 상태인지 파싱한다. */
export function parseOnboardingSeen(value: string | null): boolean {
  return value === ONBOARDING_SEEN_VALUE;
}

/**
 * 서버 렌더링 시점에는 localStorage가 없으므로 "봤음(true)"으로 간주해
 * 서버에서 다이얼로그가 자동으로 뜨지 않도록 한다.
 */
export function isOnboardingSeen(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return parseOnboardingSeen(
      window.localStorage.getItem(ONBOARDING_SEEN_STORAGE_KEY),
    );
  } catch {
    return false;
  }
}

/** 온보딩을 봤다는 사실을 로컬스토리지에 기록한다. */
export function markOnboardingSeen(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      ONBOARDING_SEEN_STORAGE_KEY,
      ONBOARDING_SEEN_VALUE,
    );
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }
}
