import type { NotificationItem } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { resolvePushLinkPath } from '@/features/my/_shared/utils/push-link';

/**
 * 알림 카드를 탭했을 때 열 앱 내 경로를 정한다.
 *
 * 서버가 실어 준 `deepLink`(운영 origin 절대 URL)를 먼저 쓰고, 허용하지 않는 origin이거나 비어 있으면
 * 공지 ID → 스토리 ID 순으로 대체한다. 셋 다 없으면 이동하지 않는다.
 *
 * @param item 알림 항목
 * @param currentOrigin 현재 페이지 origin. 로컬·프리뷰에서도 같은 경로를 열기 위해 허용한다
 * @returns 상대 경로 또는 이동할 곳이 없으면 null
 */
export function resolveNotificationPath(
  item: Pick<NotificationItem, 'deepLink' | 'noticeId' | 'storyId'>,
  currentOrigin?: string,
): string | null {
  const linked = resolvePushLinkPath(item.deepLink ?? undefined, currentOrigin);

  if (linked) return linked;

  if (item.noticeId) return APP_PATH.NOTICE_DETAIL(item.noticeId);

  if (item.storyId) return APP_PATH.STORY_DETAIL(item.storyId);

  return null;
}
