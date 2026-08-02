import {
  LINK_RESULT_COOKIE,
  type LinkResultPayload,
  parseLinkResult,
} from '@/lib/auth/link-account';

/**
 * 서버가 남긴 연동 결과 쿠키를 읽어 파싱한다. 쿠키가 없거나 손상됐으면 null이고,
 * document가 없는 서버 렌더에서도 null이다(안내는 클라이언트가 소비한다).
 *
 * @returns 파싱된 연동 결과 페이로드, 없으면 null
 */
export function readLinkResultCookie(): LinkResultPayload | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const entry = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${LINK_RESULT_COOKIE}=`));

  if (!entry) {
    return null;
  }

  return parseLinkResult(entry.slice(LINK_RESULT_COOKIE.length + 1));
}

/**
 * 연동 결과 쿠키를 지운다. 결과 안내는 1회만 해야 해서 소비 직후 호출한다.
 */
export function clearLinkResultCookie(): void {
  document.cookie = `${LINK_RESULT_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
