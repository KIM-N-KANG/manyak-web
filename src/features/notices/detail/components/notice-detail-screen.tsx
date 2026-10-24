'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import { useGetNoticesByNoticeId } from '@/api/generated/endpoints/notice-controller/notice-controller';
import { ListStatus } from '@/components/common/list-status';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { FetchError } from '@/lib/custom-fetch';
import { formatDate } from '@/lib/format-date';

import { NOTICE_COPY } from '../../_shared/constants';
import { markNoticesSeen } from '../../_shared/utils/notice-seen-storage';

type NoticeDetailScreenProps = {
  noticeId: string;
};

/**
 * 공지 상세. 제목, 게시일(고쳐 썼으면 수정일), 평문 본문을 줄바꿈만 살려 보여 준다.
 * 푸시 딥링크로 바로 들어와도 이 공지까지는 본 것으로 기록한다.
 */
export function NoticeDetailScreen({ noticeId }: NoticeDetailScreenProps) {
  const { data, error, isPending, isError, refetch } =
    useGetNoticesByNoticeId(noticeId);
  const showSkeleton = useDelayedLoading(isPending);
  const notice = data?.status === 200 ? data.data : undefined;
  const isNotFound = error instanceof FetchError && error.status === 404;

  useEffect(() => {
    markNoticesSeen(notice?.publishedAt);
  }, [notice?.publishedAt]);

  if (isNotFound) {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <ListStatus
          title={NOTICE_COPY.notFound}
          description={NOTICE_COPY.notFoundDescription}>
          <Link
            href={APP_PATH.NOTICES}
            replace
            className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            {NOTICE_COPY.backToList}
          </Link>
        </ListStatus>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <RetryListStatus
          title={NOTICE_COPY.loadFailed}
          onRetry={() => void refetch()}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain">
      {showSkeleton ? <NoticeDetailSkeleton /> : null}
      {notice ? (
        <article className="flex flex-col gap-5 px-4 pt-4 pb-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-xl leading-snug font-semibold break-keep">
              {notice.title}
            </h1>
            <NoticeDates
              publishedAt={notice.publishedAt}
              updatedAt={notice.updatedAt}
            />
          </header>
          <p className="text-base leading-7 break-words whitespace-pre-wrap">
            {notice.body}
          </p>
        </article>
      ) : null}
    </main>
  );
}

type NoticeDatesProps = {
  publishedAt?: string;
  updatedAt?: string;
};

/** 게시일과, 게시한 뒤 날짜가 바뀔 만큼 고쳐 썼을 때만 수정일을 함께 보여 준다. */
function NoticeDates({ publishedAt, updatedAt }: NoticeDatesProps) {
  if (!publishedAt) return null;

  const published = formatDate(publishedAt);
  const updated = updatedAt ? formatDate(updatedAt) : null;
  const showUpdated =
    updated !== null && updated !== published && updatedAt! > publishedAt;

  return (
    <p className="flex flex-wrap gap-x-3 text-sm text-foreground-secondary">
      <span>
        {NOTICE_COPY.publishedAt}{' '}
        <time dateTime={publishedAt}>{published}</time>
      </span>
      {showUpdated ? (
        <span>
          {NOTICE_COPY.updatedAt} <time dateTime={updatedAt}>{updated}</time>
        </span>
      ) : null}
    </p>
  );
}

function NoticeDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-4" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
