import * as amplitude from '@amplitude/unified';

import {
  type AmplitudeCookieState,
  DEVICE_ID_HEADER,
  isAmplitudeIdentityCookieName,
  parseAmplitudeCookieValue,
  SESSION_ID_HEADER,
} from './amplitude-identity';

/**
 * SDK가 저장한 쿠키에서 식별자를 읽는다. 값 형식(base64 → URL 디코드 → JSON)은
 * SDK 구현 세부사항이라 파싱 실패 시 빈 값을 반환한다.
 *
 * @returns 쿠키에서 읽은 device_id·session_id(파싱 실패 시 빈 객체)
 */
function readAmplitudeCookieState(): AmplitudeCookieState {
  const entry = document.cookie.split('; ').find((cookie) => {
    const separatorIndex = cookie.indexOf('=');
    const name =
      separatorIndex === -1 ? cookie : cookie.slice(0, separatorIndex);

    return isAmplitudeIdentityCookieName(name);
  });

  if (!entry) return {};

  return parseAmplitudeCookieValue(entry.slice(entry.indexOf('=') + 1));
}

/** dev 폴백 device_id를 재사용하기 위한 localStorage 키. */
const DEV_DEVICE_ID_STORAGE_KEY = 'manyak-dev-device-id';

/**
 * 로컬 개발에서는 Amplitude가 초기화되지 않아(production 전용) device_id가 없고,
 * 게스트 체험 한도 API가 400을 반환한다. development에 한해 임시 device_id를
 * 생성·영속화해 헤더를 채운다. localStorage가 막힌 환경에서는 조용히 생략한다.
 *
 * @returns dev 폴백 device_id(development가 아니거나 저장 실패 시 undefined)
 */
function getDevFallbackDeviceId(): string | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined;

  try {
    const stored = window.localStorage.getItem(DEV_DEVICE_ID_STORAGE_KEY);

    if (stored) return stored;

    const generated = crypto.randomUUID();

    window.localStorage.setItem(DEV_DEVICE_ID_STORAGE_KEY, generated);

    return generated;
  } catch {
    return undefined;
  }
}

/**
 * Amplitude가 채운 익명 식별자(device_id·session_id)를 API 요청 헤더로 싣는다(스펙 §AN-2-3-1).
 * 브라우저에서만 동작하며, SDK 초기화 전(콜드 로드) 첫 요청은 쿠키에서 폴백으로 읽는다.
 *
 * @returns device_id·session_id를 담은 요청 헤더 객체(서버 환경에서는 빈 객체)
 */
export function getAnalyticsIdentityHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  let deviceId = amplitude.getDeviceId();
  let sessionId = amplitude.getSessionId();

  if (deviceId === undefined || sessionId === undefined) {
    const cookieState = readAmplitudeCookieState();

    deviceId ??= cookieState.deviceId;
    sessionId ??= cookieState.sessionId;
  }

  deviceId ??= getDevFallbackDeviceId();

  const headers: Record<string, string> = {};

  if (deviceId) {
    headers[DEVICE_ID_HEADER] = deviceId;
  }

  if (sessionId !== undefined) {
    headers[SESSION_ID_HEADER] = String(sessionId);
  }

  return headers;
}
