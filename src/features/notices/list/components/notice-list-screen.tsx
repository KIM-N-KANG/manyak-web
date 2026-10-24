'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import type { PublicNoticeItemResponse } from '@/api/generated/models';
import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { PullToRefresh } from '@/components/motion/pull-to-refresh';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { APP_PATH } from '@/constants/app-path';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useInView } from '@/hooks/use-in-view';
import { useRefreshActiveQueries } from '@/hooks/use-refresh-active-queries';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

import { NoticeTagBadge } from '../../_shared/components/notice-tag-badge';
import { NOTICE_COPY } from '../../_shared/constants';
import {
  isNoticeUnread,
  useNoticeReadIds,
} from '../../_shared/utils/notice-read-storage';
import { useNotices } from '../hooks/use-notices';

/**
 * 공지사항 목록. 줄마다 태그 배지, 제목, 게시일을 두고 게시 30일 안인데 아직 열지 않은 공지에는 빨간 점을 단다.
 * 읽음은 상세를 열 때 기록되므로 목록만 봐서는 점이 사라지지 않고, 상세에서 돌아오면 그 줄의 점만 꺼진다.
 */
export function NoticeListScreen() {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );
  const readIds = useNoticeReadIds();
  const refreshActiveQueries = useRefreshActiveQueries();

  const {
    notices,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useNotices();
  const showSkeleton = useDelayedLoading(isPending);
  const hasNotices = notices.length > 0;

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

  if (isError && !hasNotices) {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <RetryListStatus
          title={NOTICE_COPY.loadFailed}
          onRetry={() => void refetch()}
        />
      </main>
    );
  }

  if (!isPending && !hasNotices) {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <EmptyListNotice>{NOTICE_COPY.empty}</EmptyListNotice>
      </main>
    );
  }

  return (
    // 당기면 첫 페이지부터 다시 읽는다. 무한 목록 재조회는 받아 둔 페이지를 순서대로 다시 받는다.
    <main className="flex min-h-0 flex-1 flex-col">
      <PullToRefresh
        ref={setScrollElement}
        onRefresh={refreshActiveQueries}
        className="h-full scroll-fade-b"
        contentClassName="flex flex-col">
        {showSkeleton ? <NoticeListSkeleton /> : null}

        {hasNotices ? (
          <ul className="flex flex-col pb-2">
            {notices.map((notice) => (
              <li key={notice.noticeId}>
                <NoticeRow
                  notice={notice}
                  isUnread={isNoticeUnread(notice, readIds)}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {isFetchingNextPage ? (
          <div className="flex justify-center py-4">
            <Spinner aria-label={NOTICE_COPY.loadingMore} />
          </div>
        ) : null}

        {isFetchNextPageError && !isFetchingNextPage ? (
          <div className="flex justify-center py-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void fetchNextPage()}>
              {NOTICE_COPY.retry}
            </Button>
          </div>
        ) : null}

        {hasNextPage ? (
          <div ref={setSentinelElement} aria-hidden="true" />
        ) : null}
      </PullToRefresh>
    </main>
  );
}

type NoticeRowProps = {
  notice: PublicNoticeItemResponse;
  isUnread: boolean;
};

function NoticeRow({ notice, isUnread }: NoticeRowProps) {
  if (!notice.noticeId) return null;

  return (
    <Link
      href={APP_PATH.NOTICE_DETAIL(notice.noticeId)}
      className="flex flex-col gap-1 px-4 py-2">
      <NoticeTagBadge tag={notice.tag} className="mb-0.5" />
      <p
        className={cn(
          'line-clamp-2 leading-6',
          isUnread ? 'font-semibold' : 'font-medium',
        )}>
        {notice.title}
        {isUnread ? (
          // 제목 끝에 붙는 작은 빨간 점. 헤더 버튼의 점과 같은 색으로 "안 본 공지"를 잇는다.
          <span className="ml-1.5 inline-block size-1.5 -translate-y-2 rounded-full bg-destructive align-baseline">
            <span className="sr-only">{NOTICE_COPY.newBadge}</span>
          </span>
        ) : null}
      </p>
      {notice.publishedAt ? (
        <time
          dateTime={notice.publishedAt}
          className="text-sm text-foreground-secondary">
          {formatDate(notice.publishedAt)}
        </time>
      ) : null}
    </Link>
  );
}

function NoticeListSkeleton() {
  return (
    <ul className="flex flex-col pb-2" aria-hidden>
      {Array.from({ length: 8 }).map((_, index) => (
        <li key={index} className="flex flex-col gap-2 px-4 py-2">
          <Skeleton className="h-5 w-14 rounded-4xl" />
          <Skeleton
            className={cn('h-5', index % 3 === 0 ? 'w-4/5' : 'w-3/5')}
          />
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  );
}
