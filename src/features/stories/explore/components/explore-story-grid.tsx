import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { STORY_LIST_COPY } from '@/features/stories/_shared/constants/story-list';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { useInView } from '@/hooks/use-in-view';
import type { StoryCardSection } from '@/observability/analytics';

import { ExploreStoryCell } from './explore-story-cell';
import { ExploreStoryTileSkeleton } from './explore-story-grid-skeleton';

/** 다음 페이지를 받는 동안 목록 끝에 잇는 골격 칸 수. 두 열 그리드의 두 줄이다. */
const NEXT_PAGE_SKELETON_COUNT = 4;

type ExploreStoryGridProps = {
  stories: StoryListItem[];
  section: StoryCardSection;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** 다음 페이지 조회가 실패한 상태. 자동 재요청을 멈추고 그 자리 재시도로 넘긴다. */
  isFetchNextPageError: boolean;
  fetchNextPage: () => unknown;
};

/**
 * 두 열 스토리 표지 그리드와 무한 스크롤.
 *
 * @remarks
 * 목록 끝 감시 요소가 화면 아래 400px 안에 들어오면 다음 페이지를 받는다. 다음 페이지 조회가 실패하면 자동 재요청을
 * 멈추고 목록 끝에 다시 시도 버튼을 둔다. 받는 동안에는 마지막 줄의 빈 칸까지 골격으로 채운다. 칸은 순번을 키로 써서
 * 목록이 바뀌어도 자리를 유지한다.
 */
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

  // 마지막 줄이 한 칸만 차 있으면 빈 오른쪽 칸부터 골격으로 채워 두 줄을 온전히 잇는다.
  const nextPageSkeletonCount = isFetchingNextPage
    ? NEXT_PAGE_SKELETON_COUNT + (stories.length % 2)
    : 0;

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
        {Array.from({ length: nextPageSkeletonCount }, (_, index) => (
          <ExploreStoryTileSkeleton key={`next-page-skeleton-${index}`} />
        ))}
      </ul>
      {isFetchingNextPage && (
        <p role="status" className="sr-only">
          {STORY_LIST_COPY.loadingLabel}
        </p>
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
