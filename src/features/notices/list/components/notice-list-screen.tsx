'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import type { PublicNoticeItemResponse } from '@/api/generated/models';
import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { APP_PATH } from '@/constants/app-path';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useInView } from '@/hooks/use-in-view';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

import { NOTICE_COPY } from '../../_shared/constants';
import {
  isNoticeUnread,
  markNoticesSeen,
  readNoticeLastSeenAt,
} from '../../_shared/utils/notice-seen-storage';
import { useNotices } from '../hooks/use-notices';

/**
 * 공지사항 목록. 줄마다 제목과 게시일을 두고 마지막으로 본 뒤 게시된 공지에는 빨간 점을 단다.
 *
 * 화면을 연 시점의 "마지막으로 본 시각"을 붙들어 두고 비교하므로, 목록을 보는 동안에는 점이 유지되고
 * 다음에 다시 열 때부터 사라진다. 기록 자체는 첫 페이지를 받는 즉시 가장 최신 게시 시각으로 올린다.
 */
export function NoticeListScreen() {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );
  // 서버 렌더링에서는 null이고 이 값으로 그리는 점 표시는 목록을 받은 뒤에야 나타나므로 하이드레이션과 어긋나지 않는다.
  const [lastSeenAtOnOpen] = useState(() => readNoticeLastSeenAt());

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
  const latestPublishedAt = notices[0]?.publishedAt;

  useEffect(() => {
    markNoticesSeen(latestPublishedAt);
  }, [latestPublishedAt]);

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
    <main
      ref={setScrollElement}
      className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain">
      {showSkeleton ? <NoticeListSkeleton /> : null}

      {hasNotices ? (
        <ul className="flex flex-col py-2">
          {notices.map((notice) => (
            <li key={notice.noticeId}>
              <NoticeRow
                notice={notice}
                isUnread={isNoticeUnread(notice.publishedAt, lastSeenAtOnOpen)}
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

      {hasNextPage ? <div ref={setSentinelElement} aria-hidden="true" /> : null}
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
      className="flex flex-col gap-1 px-4 py-3 transition-colors active:bg-muted">
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
    <ul className="flex flex-col py-2" aria-hidden>
      {Array.from({ length: 8 }).map((_, index) => (
        <li key={index} className="flex flex-col gap-2 px-4 py-3">
          <Skeleton
            className={cn('h-5', index % 3 === 0 ? 'w-4/5' : 'w-3/5')}
          />
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  );
}
