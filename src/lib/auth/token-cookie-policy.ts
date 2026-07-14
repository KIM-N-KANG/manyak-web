/** 백엔드 access 토큰을 보관하는 BFF httpOnly 쿠키 이름. */
export const ACCESS_TOKEN_COOKIE = 'manyak_session_access';
/** 백엔드 refresh 토큰(1회용·회전)을 보관하는 BFF httpOnly 쿠키 이름. */
export const REFRESH_TOKEN_COOKIE = 'manyak_session_refresh';
/** access 토큰 만료 시각(epoch ms 문자열)을 보관하는 쿠키 이름. */
export const EXPIRES_AT_COOKIE = 'manyak_session_expires_at';

/** 세션 쿠키 수명(초). 백엔드 refresh 토큰 TTL 14일과 맞춘다(스펙 §4-5 토큰 정책). */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

/** 만료 전 이 여유(ms)에 들어오면 백엔드 요청 전에 선제 재발급한다(스펙 §3-8 토큰 세션). */
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000;

/**
 * 로그인·재발급 응답의 expiresIn(초)을 만료 시각(epoch ms)으로 변환한다.
 *
 * @param nowMs 현재 시각(ms epoch)
 * @param expiresInSeconds 만료까지 남은 초
 * @returns 만료 시각(ms epoch)
 */
export function computeExpiresAt(
  nowMs: number,
  expiresInSeconds: number,
): number {
  return nowMs + expiresInSeconds * 1000;
}

/**
 * 쿠키에 저장된 만료 시각 문자열을 파싱한다. 손상된 값은 null.
 *
 * @param value 쿠키에 저장된 만료 시각 문자열
 * @returns 파싱된 만료 시각(ms epoch), 손상 시 null
 */
export function parseExpiresAt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 만료 토큰이 백엔드로 나가 익명 통과(고아 콘텐츠)되지 않도록 만료 임박 여부를 판정한다.
 *
 * @param expiresAtMs access 토큰 만료 시각(ms epoch)
 * @param nowMs 현재 시각(ms epoch)
 * @returns 선제 재발급이 필요하면 true
 */
export function shouldRefreshAccessToken(
  expiresAtMs: number,
  nowMs: number,
): boolean {
  return nowMs >= expiresAtMs - ACCESS_TOKEN_REFRESH_SKEW_MS;
}
