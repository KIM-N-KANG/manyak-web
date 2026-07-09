import { APP_PATH } from '@/constants/app-path';

/**
 * 로그인 후 복귀할 경로를 결정한다.
 * 오픈 리다이렉트를 막기 위해 앱 내 상대 경로만 허용하고,
 * 그 외(절대 URL, `//`·`/\` 시작, 미지정)는 스토리 목록으로 폴백한다.
 */
export function resolveLoginCallbackUrl(raw: string | null): string {
  if (
    raw &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.startsWith('/\\')
  ) {
    return raw;
  }

  return APP_PATH.MAIN.STORIES;
}
