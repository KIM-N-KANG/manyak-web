import { cookies } from 'next/headers';

import {
  isAmplitudeIdentityCookieName,
  parseAmplitudeCookieValue,
} from './amplitude-identity';

/**
 * 서버(BFF)에서 같은 출처 요청 쿠키의 Amplitude device_id를 읽는다.
 *
 * OAuth 콜백처럼 브라우저 fetch가 아닌 내비게이션 요청은 분석 헤더가 실리지 않으므로,
 * 쿠키가 유일한 device_id 전달 경로다. 값은 가공하지 않고 원문 그대로 반환한다.
 *
 * @returns 쿠키에서 읽은 device_id 원문(없거나 파싱 실패 시 undefined)
 */
export async function readAmplitudeDeviceIdOnServer(): Promise<
  string | undefined
> {
  const store = await cookies();
  const entry = store
    .getAll()
    .find((cookie) => isAmplitudeIdentityCookieName(cookie.name));

  if (!entry) return undefined;

  return parseAmplitudeCookieValue(entry.value).deviceId;
}
