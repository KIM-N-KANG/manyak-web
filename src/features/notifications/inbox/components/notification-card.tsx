'use client';

import Link from 'next/link';

import type { NotificationItem } from '@/api/generated/models';
import { formatRelativeDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

import { NOTIFICATION_COPY } from '../../_shared/constants';
import { resolveNotificationLabel } from '../utils/notification-display';
import { resolveNotificationPath } from '../utils/notification-link';

type NotificationCardProps = {
  item: NotificationItem;
  onRead: (item: NotificationItem) => void;
};

/**
 * 알림 한 장. 위 작은 글자가 분류와 시각을, 그 아래 제목과 본문이 내용을 맡는다.
 * 안 읽은 카드는 제목을 굵게 하고 제목 끝에 점을 둔다. 읽은 카드는 보조색으로 가라앉는다.
 * 탭하면 읽음을 기록하고 알림이 가리키는 화면을 연다. 갈 곳이 없는 알림은 읽음만 기록한다.
 */
export function NotificationCard({ item, onRead }: NotificationCardProps) {
  const isUnread = !item.readAt;
  const label = resolveNotificationLabel(item);
  const href = resolveNotificationPath(
    item,
    typeof window === 'undefined' ? undefined : window.location.origin,
  );

  const content = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2 text-xs text-foreground-tertiary">
          {label ? <span className="font-medium">{label}</span> : null}
          {item.createdAt ? (
            <time dateTime={item.createdAt} className="ml-auto shrink-0">
              {formatRelativeDate(item.createdAt)}
            </time>
          ) : null}
        </span>
        <span
          className={cn(
            'line-clamp-2 leading-6 break-keep',
            isUnread
              ? 'font-semibold text-foreground'
              : 'font-medium text-foreground-secondary',
          )}>
          {item.title}
          {isUnread ? (
            // 제목 끝에 붙는 작은 빨간 점. 헤더 종 버튼의 점과 같은 색으로 "안 본 알림"을 잇는다.
            <span className="ml-1.5 inline-block size-1.5 -translate-y-2 rounded-full bg-destructive align-baseline">
              <span className="sr-only">{NOTIFICATION_COPY.unreadCard}</span>
            </span>
          ) : null}
        </span>
        {item.body ? (
          <span
            className={cn(
              'line-clamp-2 text-sm leading-5 break-keep',
              isUnread
                ? 'text-foreground-secondary'
                : 'text-foreground-tertiary',
            )}>
            {item.body}
          </span>
        ) : null}
      </span>
    </>
  );

  const className = 'flex w-full flex-col px-4 py-2 text-left';

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        data-unread={isUnread || undefined}
        onClick={() => onRead(item)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-unread={isUnread || undefined}
      onClick={() => onRead(item)}>
      {content}
    </button>
  );
}
