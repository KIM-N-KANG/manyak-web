import type { NotificationItem } from '@/api/generated/models';
import { NOTICE_TAG_LABEL } from '@/features/notices/_shared/constants';

import { NOTIFICATION_TYPE_LABEL } from '../../_shared/constants';

/**
 * 카드 위에 붙는 분류 라벨을 정한다. 공지에서 비롯한 알림(`noticeTag` 있음)은 유형과 무관하게 태그 라벨
 * ("업데이트"·"혜택" 등)을 쓰고, 태그가 없으면 유형 라벨을 쓴다. 모르는 유형은 라벨을 두지 않는다.
 *
 * @param item 알림 항목
 * @returns 라벨 또는 null
 */
export function resolveNotificationLabel(
  item: Pick<NotificationItem, 'type' | 'noticeTag'>,
): string | null {
  const tag = item.noticeTag;

  if (tag && tag in NOTICE_TAG_LABEL) return NOTICE_TAG_LABEL[tag];

  return (item.type && NOTIFICATION_TYPE_LABEL[item.type]) ?? null;
}
