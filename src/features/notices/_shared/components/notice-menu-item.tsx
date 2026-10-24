'use client';

import { Megaphone02Icon } from '@hugeicons/core-free-icons';

import { APP_PATH } from '@/constants/app-path';
import { MyMenuItem } from '@/features/my/_shared/components/my-menu-item';

import { NOTICE_COPY } from '../constants';
import { useUnreadNotice } from '../hooks/use-unread-notice';

/** 마이 알림 섹션의 공지사항 메뉴. 마지막으로 본 뒤 게시된 공지가 있으면 라벨 옆에 "새 공지" 배지를 단다. */
export function NoticeMenuItem() {
  const hasUnread = useUnreadNotice();

  return (
    <MyMenuItem
      icon={Megaphone02Icon}
      label={NOTICE_COPY.title}
      href={APP_PATH.NOTICES}
      badge={hasUnread ? NOTICE_COPY.newBadge : undefined}
    />
  );
}
