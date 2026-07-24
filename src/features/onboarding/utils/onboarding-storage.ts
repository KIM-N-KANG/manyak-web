import {
  ONBOARDING_SEEN_COOKIE,
  ONBOARDING_SEEN_COOKIE_MAX_AGE_SECONDS,
  ONBOARDING_SEEN_STORAGE_KEY,
  ONBOARDING_SEEN_VALUE,
} from '../constants';

/**
 * 로컬스토리지에 저장된 값이 온보딩을 본 상태인지 파싱한다.
 *
 * @param value 로컬스토리지에서 읽은 값(없으면 null)
 * @returns 온보딩을 본 상태이면 true
 */
export function parseOnboardingSeen(value: string | null): boolean {
  return value === ONBOARDING_SEEN_VALUE;
}

/**
 * 서버 렌더링 시점에는 localStorage가 없으므로 "봤음(true)"으로 간주해
 * 서버에서 다이얼로그가 자동으로 뜨지 않도록 한다.
 *
 * @returns 온보딩을 이미 봤으면 true
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

/**
 * 서버(proxy)가 온보딩 리다이렉트를 건너뛰도록 게이트 닫힘 쿠키를 심는다.
 * 노출 조건 미충족으로 온보딩에서 되돌려 보낼 때도 호출해, proxy 리다이렉트와
 * 페이지 가드의 홈 복귀가 서로를 되부르는 루프를 막는다.
 */
export function setOnboardingSeenCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${ONBOARDING_SEEN_COOKIE}=${ONBOARDING_SEEN_VALUE}; path=/; max-age=${ONBOARDING_SEEN_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

/** 온보딩을 봤다는 사실을 로컬스토리지와 쿠키에 기록한다. */
export function markOnboardingSeen(): void {
  if (typeof window === 'undefined') {
    return;
  }

  setOnboardingSeenCookie();

  try {
    window.localStorage.setItem(
      ONBOARDING_SEEN_STORAGE_KEY,
      ONBOARDING_SEEN_VALUE,
    );
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }
}
