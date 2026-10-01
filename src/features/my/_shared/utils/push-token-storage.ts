'use client';

/**
 * 서버에 마지막으로 등록한 FCM 토큰을 보관하는 localStorage 키.
 *
 * 로그아웃·탈퇴 때 이 기기의 토큰만 서버에서 지우기 위해 둔다(서버 로그아웃은 다른 기기
 * 토큰까지 지울 수 없어 토큰을 지우지 않는다). 등록 성공 시 기록하고 세션 종료 정리에서
 * 삭제한다. 토큰은 설치본 주소일 뿐 자격증명이 아니다.
 */
export const PUSH_TOKEN_STORAGE_KEY = 'manyak:push-token';

/**
 * localStorage를 안전하게 얻는다. SSR·저장소 접근 차단 환경에서는 null이다.
 *
 * @returns 사용할 수 있는 localStorage 또는 null
 */
function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 마지막으로 서버에 등록한 토큰을 읽는다.
 *
 * @returns 등록 토큰 또는 null
 */
export function readRegisteredPushToken(): string | null {
  return getLocalStorage()?.getItem(PUSH_TOKEN_STORAGE_KEY) ?? null;
}

/**
 * 서버 등록에 성공한 토큰을 기록한다.
 *
 * @param token FCM 등록 토큰
 */
export function writeRegisteredPushToken(token: string): void {
  getLocalStorage()?.setItem(PUSH_TOKEN_STORAGE_KEY, token);
}

/** 기록한 토큰을 지운다. */
export function clearRegisteredPushToken(): void {
  getLocalStorage()?.removeItem(PUSH_TOKEN_STORAGE_KEY);
}
