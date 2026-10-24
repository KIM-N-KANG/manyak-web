import type { NotificationItem } from '@/api/generated/models';
import { NOTICE_TAG_LABEL } from '@/features/notices/_shared/constants';

import { NOTIFICATION_TYPE_LABEL } from '../../_shared/constants';

/**
 * 카드 위에 붙는 분류 라벨을 정한다. 공지는 태그 라벨("업데이트" 등)을 쓰고, 태그가 없거나 모르는 값이면
 * "공지"로 받는다. 모르는 유형은 라벨을 두지 않는다.
 *
 * @param item 알림 항목
 * @returns 라벨 또는 null
 */
export function resolveNotificationLabel(
  item: Pick<NotificationItem, 'type' | 'noticeTag'>,
): string | null {
  if (item.type === 'NOTICE') {
    const tag = item.noticeTag;

    return tag && tag in NOTICE_TAG_LABEL
      ? NOTICE_TAG_LABEL[tag]
      : NOTIFICATION_TYPE_LABEL.NOTICE;
  }

  return (item.type && NOTIFICATION_TYPE_LABEL[item.type]) ?? null;
}
