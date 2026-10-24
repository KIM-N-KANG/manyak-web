'use client';

import { Notification01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { cn } from '@/lib/utils';

import { NOTICE_COPY } from '../constants';
import { useUnreadNotice } from '../hooks/use-unread-notice';

/**
 * 메인 헤더 오른쪽의 공지사항 버튼. 마지막으로 본 뒤 게시된 공지가 있으면 아이콘 오른쪽 위에 빨간 점을 찍는다.
 */
export function NoticeHeaderButton() {
  const hasUnread = useUnreadNotice();

  return (
    <Link
      href={APP_PATH.NOTICES}
      aria-label={
        hasUnread ? NOTICE_COPY.unreadButtonLabel : NOTICE_COPY.buttonLabel
      }
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        // 헤더 좌우 여백(16px)에 아이콘 글리프를 맞추려고 버튼 여백만큼 당긴다.
        'relative -mr-2.5',
      )}>
      <HugeiconsIcon icon={Notification01Icon} aria-hidden="true" />
      {hasUnread ? (
        <span
          data-testid="notice-unread-dot"
          aria-hidden="true"
          className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background"
        />
      ) : null}
    </Link>
  );
}
