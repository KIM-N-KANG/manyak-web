'use client';

import { useEffect, useState } from 'react';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  STORY_LIST_COPY,
  STORY_LIST_ERROR_TITLE,
} from '@/features/stories/_shared/constants/story-list';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useInView } from '@/hooks/use-in-view';

import { useExploreStories } from '../hooks/use-explore-stories';
import { ExploreStoryCell } from './explore-story-cell';
import { ExploreStoryGridSkeleton } from './explore-story-grid-skeleton';

export function ExploreStoryList() {
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );

  const {
    stories,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useExploreStories();
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

  const renderContent = () => {
    if (isPending) {
      return showSkeleton ? <ExploreStoryGridSkeleton /> : null;
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
        <ul className="grid grid-cols-3 gap-0.5">
          {stories.map((story, index) => (
            <ExploreStoryCell key={index} story={story} position={index} />
          ))}
        </ul>
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
        {hasNextPage && (
          <div ref={setSentinelElement} aria-hidden="true" className="h-1" />
        )}
      </>
    );
  };

  return <section className="flex flex-1 flex-col">{renderContent()}</section>;
}
