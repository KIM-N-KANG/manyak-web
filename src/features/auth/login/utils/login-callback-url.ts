import { APP_PATH } from '@/constants/app-path';

/**
 * URL 파서가 제거해 `//evil.com` 류 우회를 만들 수 있는 제어 문자(U+0000–U+001F)
 * 포함 여부를 검사한다.
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
