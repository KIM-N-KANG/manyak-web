'use client';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import {
  STORY_LIST_COPY,
  STORY_LIST_ERROR_TITLE,
} from '@/features/stories/_shared/constants/story-list';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

import { useExploreStories } from '../hooks/use-explore-stories';
import { ExploreStoryGrid } from './explore-story-grid';
import { ExploreStoryGridSkeleton } from './explore-story-grid-skeleton';

export function ExploreStoryList() {
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
      <ExploreStoryGrid
        stories={stories}
        section="explore"
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isFetchNextPageError={isFetchNextPageError}
        fetchNextPage={fetchNextPage}
      />
    );
  };

  return <section className="flex flex-1 flex-col">{renderContent()}</section>;
}
