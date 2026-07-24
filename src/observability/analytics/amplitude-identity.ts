/** Amplitude device_id를 백엔드로 전달하는 요청 헤더 이름. */
export const DEVICE_ID_HEADER = 'X-Manyak-Device-Id';
/** Amplitude session_id를 백엔드로 전달하는 요청 헤더 이름. */
export const SESSION_ID_HEADER = 'X-Manyak-Session-Id';

/** 식별자 쿠키만 고르고 마케팅용 AMP_MKTG_ 쿠키는 제외하기 위한 접두사. */
const AMP_COOKIE_PREFIX = 'AMP_';
const AMP_MKTG_COOKIE_PREFIX = 'AMP_MKTG_';

/** Amplitude SDK가 쿠키에 저장하는 익명 식별자 상태. */
export interface AmplitudeCookieState {
  deviceId?: string;
  sessionId?: number;
}

/**
 * 쿠키 이름이 Amplitude 식별자 쿠키인지 판별한다(마케팅용 AMP_MKTG_ 쿠키는 제외).
 *
 * @param name 검사할 쿠키 이름
 * @returns Amplitude 식별자 쿠키면 true
 */
export function isAmplitudeIdentityCookieName(name: string): boolean {
  return (
    name.startsWith(AMP_COOKIE_PREFIX) &&
    !name.startsWith(AMP_MKTG_COOKIE_PREFIX)
  );
}

/**
 * Amplitude SDK가 저장한 쿠키 값에서 식별자를 파싱한다. 값 형식(base64 → URL 디코드 →
 * JSON)은 SDK 구현 세부사항이라 파싱 실패 시 빈 값을 반환한다. 브라우저·서버(Node 18+의
 * 전역 atob) 어디서든 동작하는 순수 함수다.
 *
 * @param rawValue 쿠키에 저장된 원본 값
 * @returns 파싱한 device_id·session_id(파싱 실패 시 빈 객체)
 */
export function parseAmplitudeCookieValue(
  rawValue: string,
): AmplitudeCookieState {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(rawValue)));

    if (typeof parsed !== 'object' || parsed === null) return {};

    const { deviceId, sessionId } = parsed as Record<string, unknown>;

    return {
      deviceId: typeof deviceId === 'string' ? deviceId : undefined,
      sessionId: typeof sessionId === 'number' ? sessionId : undefined,
    };
  } catch {
    return {};
  }
}
