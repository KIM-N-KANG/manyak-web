import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { EXPLORE_SEARCH_COPY } from '@/features/stories/_shared/constants/explore-search';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

import { useStorySearch } from '../hooks/use-story-search';
import { ExploreStoryGrid } from './explore-story-grid';
import { ExploreStoryGridSkeleton } from './explore-story-grid-skeleton';

type ExploreSearchResultsProps = {
  query: string;
};

export function ExploreSearchResults({ query }: ExploreSearchResultsProps) {
  const {
    stories,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useStorySearch(query);
  const showSkeleton = useDelayedLoading(isPending);
  const hasStories = stories.length > 0;

  if (isPending) {
    return showSkeleton ? <ExploreStoryGridSkeleton /> : null;
  }

  if (isError && !hasStories) {
    return (
      <RetryListStatus
        title={EXPLORE_SEARCH_COPY.loadFailed}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!hasStories && !hasNextPage) {
    return <EmptyListNotice>{EXPLORE_SEARCH_COPY.empty}</EmptyListNotice>;
  }

  return (
    <ExploreStoryGrid
      stories={stories}
      section="search"
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      isFetchNextPageError={isFetchNextPageError}
      fetchNextPage={fetchNextPage}
    />
  );
}
