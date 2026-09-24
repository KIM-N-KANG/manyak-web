'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { StoryPageResponse } from '@/api/generated/models';
import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { StoryCardGrid } from '@/features/stories/_shared/components/story-card-grid';
import { STORY_LIST_ERROR_TITLE } from '@/features/stories/_shared/constants/story-list';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useInView } from '@/hooks/use-in-view';
import { useTrackOnView } from '@/observability/analytics';

import { STORY_LIST_COPY, type StoryListQuery } from '../constants';
import { usePublicStories } from '../hooks/use-public-stories';
import {
  parseStoryListQuery,
  toStoryListSearch,
} from '../utils/story-list-query';
import { StoryListSkeleton } from './story-list-skeleton';
import { StoryListToolbar } from './story-list-toolbar';

type HomeStoryListProps = {
  /** 서버 렌더 시점에 읽은 기본 필터·정렬의 첫 페이지. 없으면 클라이언트가 조회한다. */
  initialPage?: StoryPageResponse;
};

export function HomeStoryList({ initialPage }: HomeStoryListProps) {
  const query = parseStoryListQuery(useSearchParams());

  return <StoryList query={query} initialPage={initialPage} />;
}

type StoryListProps = HomeStoryListProps & {
  query: StoryListQuery;
};

export function StoryList({ query, initialPage }: StoryListProps) {
  useTrackOnView('client_storyList_viewed');

  const router = useRouter();
  const pathname = usePathname();
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );

  const isDefaultQuery = toStoryListSearch(query) === '';
  const {
    stories,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = usePublicStories(query, isDefaultQuery ? initialPage : undefined);
  const showSkeleton = useDelayedLoading(isPending);
  const hasStories = stories.length > 0;

  const isSentinelInView = useInView({
    target: sentinelElement,
    rootMargin: '0px 0px 400px 0px',
    initialInView: false,
  });

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

  const handleQueryChange = (nextQuery: StoryListQuery) => {
    router.replace(`${pathname}${toStoryListSearch(nextQuery)}`, {
      scroll: false,
    });
  };

  const renderContent = () => {
    if (isPending) {
      return showSkeleton ? <StoryListSkeleton /> : null;
    }

    if (isError && !hasStories) {
      return (
        <RetryListStatus
          title={STORY_LIST_ERROR_TITLE}
          onRetry={() => void refetch()}
        />
      );
    }

    if (!hasStories) {
      return <EmptyListNotice>{STORY_LIST_COPY.empty}</EmptyListNotice>;
    }

    return (
      <>
        <StoryCardGrid
          stories={stories}
          section="original"
          isOriginal={query.filter === 'original'}
        />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Spinner aria-label={STORY_LIST_COPY.loadingLabel} />
          </div>
        )}
        {isFetchNextPageError && !isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void fetchNextPage()}>
              다시 시도하기
            </Button>
          </div>
        )}
        {hasNextPage && <div ref={setSentinelElement} aria-hidden="true" />}
      </>
    );
  };

  return (
    <section className="flex flex-1 flex-col gap-2 px-4 pb-4">
      <StoryListToolbar query={query} onChange={handleQueryChange} />
      {renderContent()}
    </section>
  );
}
