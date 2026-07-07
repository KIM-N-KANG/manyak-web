import * as amplitude from '@amplitude/unified';

/** Amplitude device_id를 백엔드로 전달하는 요청 헤더 이름. */
export const DEVICE_ID_HEADER = 'X-Manyak-Device-Id';
/** Amplitude session_id를 백엔드로 전달하는 요청 헤더 이름. */
export const SESSION_ID_HEADER = 'X-Manyak-Session-Id';

/** 식별자 쿠키만 고르고 마케팅용 AMP_MKTG_ 쿠키는 제외하기 위한 접두사. */
const AMP_COOKIE_PREFIX = 'AMP_';
const AMP_MKTG_COOKIE_PREFIX = 'AMP_MKTG_';

interface AmplitudeCookieState {
  deviceId?: string;
  sessionId?: number;
}

/**
 * SDK가 저장한 쿠키에서 식별자를 읽는다. 값 형식(base64 → URL 디코드 → JSON)은
 * SDK 구현 세부사항이라 파싱 실패 시 빈 값을 반환한다.
 */
function readAmplitudeCookieState(): AmplitudeCookieState {
  const entry = document.cookie
    .split('; ')
    .find(
      (cookie) =>
        cookie.startsWith(AMP_COOKIE_PREFIX) &&
        !cookie.startsWith(AMP_MKTG_COOKIE_PREFIX),
    );

  if (!entry) return {};

  const rawValue = entry.slice(entry.indexOf('=') + 1);

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

/** dev 폴백 device_id를 재사용하기 위한 localStorage 키. */
const DEV_DEVICE_ID_STORAGE_KEY = 'manyak-dev-device-id';

/**
 * 로컬 개발에서는 Amplitude가 초기화되지 않아(production 전용) device_id가 없고,
 * 게스트 체험 한도 API가 400을 반환한다. development에 한해 임시 device_id를
 * 생성·영속화해 헤더를 채운다. localStorage가 막힌 환경에서는 조용히 생략한다.
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
