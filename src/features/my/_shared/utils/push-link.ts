import { SITE_URL } from '@/constants/site';

/**
 * 푸시의 `deepLink`를 앱 내 상대 경로로 바꾼다. 서버는 운영 origin 기준 절대 URL을
 * 싣는다(dev도 운영 origin). 서비스 origin이 아닌 링크는 열지 않는다.
 *
 * @param link 페이로드의 절대 URL
 * @param currentOrigin 현재 페이지 origin. 로컬·프리뷰에서도 같은 경로를 열기 위해 허용한다
 * @returns `pathname + search` 또는 허용하지 않는 링크면 null
 */
export function resolvePushLinkPath(
  link: string | undefined,
  currentOrigin?: string,
): string | null {
  if (!link) {
    return null;
  }

  try {
    const url = new URL(link);
    const allowedOrigins = [SITE_URL, currentOrigin].filter(Boolean);

    if (!allowedOrigins.includes(url.origin)) {
      return null;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
