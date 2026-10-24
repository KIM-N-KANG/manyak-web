'use client';

import { useEffect, useState } from 'react';

import type {
  GetUsersMeNotificationsCategory,
  NotificationItem,
} from '@/api/generated/models';
import { ListStatus } from '@/components/common/list-status';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { PullToRefresh } from '@/components/motion/pull-to-refresh';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useInView } from '@/hooks/use-in-view';
import { useRefreshActiveQueries } from '@/hooks/use-refresh-active-queries';

import { NOTIFICATION_COPY } from '../../_shared/constants';
import { useNotifications } from '../hooks/use-notifications';
import { NotificationCard } from './notification-card';
import { NotificationListSkeleton } from './notification-list-skeleton';

type NotificationListProps = {
  category: GetUsersMeNotificationsCategory;
  /** 회원 판정이 끝나기 전에는 조회하지 않기 위한 활성화 플래그 */
  enabled: boolean;
  onRead: (item: NotificationItem) => void;
};

const EMPTY_COPY = {
  NEWS: {
    title: NOTIFICATION_COPY.emptyNews,
    description: NOTIFICATION_COPY.emptyNewsDescription,
  },
  ACTIVITY: {
    title: NOTIFICATION_COPY.emptyActivity,
    description: NOTIFICATION_COPY.emptyActivityDescription,
  },
} as const;

/**
 * 한 분류의 알림 목록. 탭 줄은 셸에 고정돼 있어 이 목록이 자기 스크롤러를 소유하고, 당기면 첫 페이지부터 다시 읽는다.
 */
export function NotificationList({
  category,
  enabled,
  onRead,
}: NotificationListProps) {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );
  const refreshActiveQueries = useRefreshActiveQueries();

  const {
    notifications,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useNotifications({ category, enabled });
  const showSkeleton = useDelayedLoading(isPending);
  const hasNotifications = notifications.length > 0;

  const isSentinelInView = useInView({
    target: sentinelElement,
    root: scrollElement,
    initialInView: false,
  });

  // 목록 끝에 닿으면 다음 커서를 잇는다. 실패한 뒤에는 자동으로 다시 요청하지 않고 그 자리 재시도 버튼에 넘긴다.
  useEffect(() => {
    if (
      !isSentinelInView ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError
    ) {
      return;
    }

    void fetchNextPage();
  }, [
    isSentinelInView,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  ]);

  if (isError && !hasNotifications) {
    return (
      <RetryListStatus
        title={NOTIFICATION_COPY.loadFailed}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!isPending && !hasNotifications) {
    const empty = EMPTY_COPY[category];

    return (
      <ListStatus title={empty.title} description={empty.description}>
        {null}
      </ListStatus>
    );
  }

  return (
    <PullToRefresh
      ref={setScrollElement}
      onRefresh={refreshActiveQueries}
      className="h-full scroll-fade-b"
      contentClassName="flex flex-col">
      {showSkeleton ? <NotificationListSkeleton /> : null}

      {hasNotifications ? (
        <ul className="flex flex-col py-2">
          {notifications.map((item) => (
            <li key={item.notificationId}>
              <NotificationCard item={item} onRead={onRead} />
            </li>
          ))}
        </ul>
      ) : null}

      {isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Spinner aria-label={NOTIFICATION_COPY.loadingMore} />
        </div>
      ) : null}

      {isFetchNextPageError && !isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void fetchNextPage()}>
            {NOTIFICATION_COPY.retry}
          </Button>
        </div>
      ) : null}

      {hasNextPage ? <div ref={setSentinelElement} aria-hidden="true" /> : null}
    </PullToRefresh>
  );
}
