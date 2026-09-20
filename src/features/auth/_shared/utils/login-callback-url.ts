import { APP_PATH } from '@/constants/app-path';

/**
 * URL 파서가 제거해 `//evil.com` 류 우회를 만들 수 있는 제어 문자(U+0000–U+001F)
 * 포함 여부를 검사한다.
 *
 * @param value 검사할 문자열
 * @returns 제어 문자가 포함되어 있으면 true
 */
function hasControlChar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) <= 0x1f) {
      return true;
    }
  }

  return false;
}

/**
 * 로그인 후 복귀할 경로를 결정한다.
 * 오픈 리다이렉트를 막기 위해 앱 내 상대 경로만 허용하고,
 * 그 외(절대 URL, `//`·`/\` 시작, 제어 문자 포함, 미지정)는 스토리 목록으로 폴백한다.
 *
 * @param raw 복귀 후보 경로(없으면 null)
 * @returns 허용된 앱 내 상대 경로, 그 외에는 스토리 목록 경로
 */
export function resolveLoginCallbackUrl(raw: string | null): string {
  if (
    raw &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.startsWith('/\\') &&
    !hasControlChar(raw)
  ) {
    return raw;
  }

  return APP_PATH.MAIN.STORIES;
}

/**
 * 위치 정보를 복귀용 앱 내 상대 경로로 합친다. pathname만 쓰면 쿼리·해시(선택한 시작
 * 설정, 스크롤 대상 등)가 사라지므로 세 부분을 모두 잇는다.
 *
 * @param location pathname·search·hash를 가진 위치 정보
 * @returns `pathname + search + hash` 형태의 상대 경로
 */
export function toAppPath({
  pathname,
  search,
  hash,
}: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  return `${pathname}${search}${hash}`;
}

/**
 * 현재 문서 위치를 복귀용 앱 내 상대 경로로 읽는다. 로그인 시트·인앱 직행처럼
 * 사용자가 버튼을 누른 그 화면으로 돌아와야 하는 진입점이 공통으로 쓴다.
 *
 * @returns 현재 위치의 상대 경로. 브라우저 밖(SSR)에서는 null
 */
export function readCurrentAppPath(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return toAppPath(window.location);
}

/**
 * 로그인 화면 경로에 복귀용 callbackUrl 쿼리를 붙인다.
 * callbackUrl이 없으면 순수 로그인 경로를 반환한다.
 *
 * @param callbackUrl 로그인 후 복귀할 경로(없으면 null)
 * @returns callbackUrl 쿼리가 붙은 로그인 경로
 */
export function buildLoginUrl(callbackUrl: string | null): string {
  if (!callbackUrl) {
    return APP_PATH.LOGIN;
  }

  return `${APP_PATH.LOGIN}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
