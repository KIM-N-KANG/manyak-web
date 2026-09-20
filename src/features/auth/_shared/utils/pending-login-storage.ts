'use client';

/**
 * 동의 전 로그인이 이 탭에서 시작됐음을 남기는 sessionStorage 키.
 *
 * 쿠키는 탭 단위로 격리할 수 없어, "동의를 마치지 않은 로그인은 탭을 닫으면 유지되지
 * 않는다"를 앱 수준에서 보장하는 최소 장치다. OAuth 시작 직전에 기록하고, 같은 탭으로
 * 돌아오는 OAuth 복귀·새로고침에서는 남아 있어 동의 절차를 이어 간다. 인증 상태인데 필수
 * 동의가 남았고 이 표시가 없으면 이전 탭에서 끝내지 않은 로그인으로 보고 로그아웃한다.
 *
 * 한계 — sessionStorage는 보안 경계가 아니다. 브라우저의 닫은 탭 복원·세션 복원, 탭 복제,
 * `noopener` 없는 새 창 열기는 값을 함께 복사·복원할 수 있다. 동의 완료 여부의 정본은
 * 항상 동의 조회 API이며 이 표시는 판정 보조일 뿐이다. localStorage에는 두지 않는다.
 */
export const PENDING_LOGIN_STORAGE_KEY = 'manyak:pending-login';

const PENDING_LOGIN_VALUE = '1';

/**
 * sessionStorage를 안전하게 얻는다. SSR·저장소 접근 차단 환경에서는 null이다.
 *
 * @returns 사용할 수 있는 sessionStorage 또는 null
 */
function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** OAuth 시작 직전에 이 탭의 로그인 진행 표시를 남긴다. */
export function markPendingLogin(): void {
  getSessionStorage()?.setItem(PENDING_LOGIN_STORAGE_KEY, PENDING_LOGIN_VALUE);
}

/**
 * 이 탭에서 시작한 로그인 진행 표시가 있는지 읽는다.
 *
 * @returns 표시가 있으면 true
 */
export function hasPendingLogin(): boolean {
  return (
    getSessionStorage()?.getItem(PENDING_LOGIN_STORAGE_KEY) ===
    PENDING_LOGIN_VALUE
  );
}

/** 동의 완료·로그아웃 시 로그인 진행 표시를 지운다. */
export function clearPendingLogin(): void {
  getSessionStorage()?.removeItem(PENDING_LOGIN_STORAGE_KEY);
}
