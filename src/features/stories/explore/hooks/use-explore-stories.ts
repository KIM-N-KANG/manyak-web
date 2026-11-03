'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { getExploreStories } from '@/api/generated/endpoints/stories/stories';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { EXPLORE_STORIES_QUERY_KEY } from '@/features/stories/_shared/utils/explore-stories-query';
import { toOrderedStoryListItems } from '@/features/stories/_shared/utils/to-story-list-items';

/**
 * 탐색 목록을 커서로 이어 받는 훅.
 *
 * 첫 페이지는 `cursor` 없이 불러 서버가 새로 섞은 순서를 받고, 다음 페이지는 그 순서가 담긴 `nextCursor`로 잇는다.
 * 다시 읽으면 순서가 바뀌므로 저절로 다시 읽지 않고 캐시도 지우지 않는다. 새 순서는 탭 진입과 당겨서 새로고침에서만 받는다.
 *
 * @returns 이어 붙인 스토리 목록과 페이지 상태
 */
export function useExploreStories() {
  const result = useInfiniteQuery({
    queryKey: EXPLORE_STORIES_QUERY_KEY,
    queryFn: ({ pageParam, signal }) =>
      getExploreStories(pageParam ? { cursor: pageParam } : undefined, {
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.status === 200
        ? (lastPage.data.nextCursor ?? undefined)
        : undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const stories: StoryListItem[] = toOrderedStoryListItems(
    result.data?.pages.flatMap((page) =>
      page.status === 200 ? (page.data.items ?? []) : [],
    ) ?? [],
  );

  return {
    stories,
    isPending: result.isPending,
    isError: result.isError,
    refetch: result.refetch,
    fetchNextPage: result.fetchNextPage,
    hasNextPage: result.hasNextPage,
    isFetchingNextPage: result.isFetchingNextPage,
    /** 다음 페이지 조회가 실패한 상태. 자동 재요청을 멈추고 그 자리 재시도로 넘긴다. */
    isFetchNextPageError: result.isFetchNextPageError,
  };
}
