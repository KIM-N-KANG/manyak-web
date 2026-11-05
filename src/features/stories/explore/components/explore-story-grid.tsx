import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { STORY_LIST_COPY } from '@/features/stories/_shared/constants/story-list';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { useInView } from '@/hooks/use-in-view';
import type { StoryCardSection } from '@/observability/analytics';

import { ExploreStoryCell } from './explore-story-cell';

type ExploreStoryGridProps = {
  stories: StoryListItem[];
  section: StoryCardSection;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** 다음 페이지 조회가 실패한 상태. 자동 재요청을 멈추고 그 자리 재시도로 넘긴다. */
  isFetchNextPageError: boolean;
  fetchNextPage: () => unknown;
};

export function ExploreStoryGrid({
  stories,
  section,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  fetchNextPage,
}: ExploreStoryGridProps) {
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );

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

  return (
    <>
      <ul className="grid grid-cols-2 gap-0.5">
        {stories.map((story, index) => (
          <ExploreStoryCell
            key={index}
            story={story}
            position={index}
            section={section}
          />
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
}
