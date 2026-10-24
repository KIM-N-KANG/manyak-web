'use client';

import { Notification01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { NoticeHeaderButton } from '@/features/notices/_shared/components/notice-header-button';
import { cn } from '@/lib/utils';

import { NOTIFICATION_COPY } from '../constants';
import { useUnreadNotifications } from '../hooks/use-unread-notifications';

/**
 * 메인 헤더 오른쪽의 종 버튼. 회원은 알림함으로, 게스트는 공지사항 목록으로 간다.
 * 회원은 서버의 안 읽은 알림 수가 있으면 아이콘 오른쪽 위에 빨간 점을 찍는다.
 */
export function NotificationHeaderButton() {
  const { isMember } = useMemberAccess();

  if (!isMember) return <NoticeHeaderButton />;

  return <InboxHeaderButton />;
}

function InboxHeaderButton() {
  const { total } = useUnreadNotifications();
  const hasUnread = total > 0;

  return (
    <Link
      href={APP_PATH.NOTIFICATIONS}
      aria-label={
        hasUnread
          ? NOTIFICATION_COPY.unreadButtonLabel
          : NOTIFICATION_COPY.buttonLabel
      }
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        // 헤더 좌우 여백(16px)에 아이콘 글리프를 맞추려고 버튼 여백만큼 당긴다.
        'relative -mr-2.5',
      )}>
      <HugeiconsIcon icon={Notification01Icon} aria-hidden="true" />
      {hasUnread ? (
        <span
          data-testid="notification-unread-dot"
          aria-hidden="true"
          className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background"
        />
      ) : null}
    </Link>
  );
}
