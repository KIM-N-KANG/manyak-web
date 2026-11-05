'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import {
  getSearchStoriesQueryKey,
  searchStories,
} from '@/api/generated/endpoints/stories/stories';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { toOrderedStoryListItems } from '@/features/stories/_shared/utils/to-story-list-items';

/**
 * 공개 스토리 검색 결과를 커서로 이어 받는 훅.
 *
 * 서버가 관련도순으로 돌려주고 다음 페이지는 같은 검색어와 `nextCursor`로 잇는다. 서버는 받은 결과에서
 * 비공개로 바뀐 스토리를 빼고 응답하므로 항목이 비어 있어도 `nextCursor`가 있으면 다음 페이지가 남아 있다.
 *
 * @param query 제출한 검색어(앞뒤 공백을 뺀 2자 이상)
 * @returns 이어 붙인 검색 결과와 페이지 상태
 */
export function useStorySearch(query: string) {
  const result = useInfiniteQuery({
    queryKey: [...getSearchStoriesQueryKey({ q: query }), 'infinite'],
    queryFn: ({ pageParam, signal }) =>
      searchStories({ q: query, cursor: pageParam }, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.status === 200
        ? (lastPage.data.nextCursor ?? undefined)
        : undefined,
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
    isFetchNextPageError: result.isFetchNextPageError,
  };
}
