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
 * 메인 헤더 오른쪽 끝 버튼. 회원은 종(알림함), 게스트는 확성기(공지사항)다.
 * 회원 판정이 끝나기 전에는 같은 크기의 빈 자리만 두어 확성기가 떴다가 종으로 바뀌는 깜빡임을 막는다.
 * 회원은 서버의 안 읽은 알림 수가 있으면 아이콘 오른쪽 위에 빨간 점을 찍는다.
 */
export function NotificationHeaderButton() {
  const { isMember, isGuest } = useMemberAccess();

  if (isMember) return <InboxHeaderButton />;

  if (isGuest) return <NoticeHeaderButton />;

  return <span aria-hidden="true" className="-mr-2.5 size-10" />;
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
