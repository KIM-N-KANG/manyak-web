import { APP_PATH } from '@/constants/app-path';

/**
 * 공유 열람 화면의 절대 URL을 만든다. 공유 시트와 클립보드 폴백이 같은 값을 쓴다.
 *
 * @param shareId 발급받은 공유 열람 토큰
 * @param origin 현재 문서의 오리진(`window.location.origin`)
 * @returns 공유 열람 화면의 절대 URL
 */
export function buildShareUrl(shareId: string, origin: string): string {
  return new URL(APP_PATH.SHARE_VIEW(shareId), origin).toString();
}
