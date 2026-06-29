import * as amplitude from '@amplitude/unified';

export const DEVICE_ID_HEADER = 'X-Manyak-Device-Id';
export const SESSION_ID_HEADER = 'X-Manyak-Session-Id';

/**
 * Amplitude Browser SDK가 자동으로 채운 익명 식별자(device_id·session_id)를
 * 백엔드 API 요청 헤더로 싣는다(스펙 §AN-2-3-1).
 *
 * 값은 브라우저에서 SDK가 초기화된 뒤에만 존재하므로, 서버 사이드나 미초기화
 * 상태에서는 빈 헤더를 만들지 않고 생략한다. 프론트엔드는 원본 값만 싣고,
 * 해시(`device_id_hash`) 변환·저장은 백엔드가 담당한다.
 */
export function getAnalyticsIdentityHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const headers: Record<string, string> = {};

  const deviceId = amplitude.getDeviceId();

  if (deviceId) {
    headers[DEVICE_ID_HEADER] = deviceId;
  }

  const sessionId = amplitude.getSessionId();

  if (sessionId !== undefined) {
    headers[SESSION_ID_HEADER] = String(sessionId);
  }

  return headers;
}
