'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import {
  getGetPublicStoriesQueryKey,
  getPublicStories,
} from '@/api/generated/endpoints/stories/stories';
import type { StoryPageResponse } from '@/api/generated/models';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { toOrderedStoryListItems } from '@/features/stories/_shared/utils/to-story-list-items';

import type { StoryListQuery } from '../constants';

/**
 * 홈 공개 스토리 목록을 커서로 이어 받는 훅.
 *
 * 필터·정렬마다 캐시를 따로 두고, 다음 페이지는 응답의 `nextCursor`를 같은 필터·정렬과 함께
 * 되돌려 준다. 서버가 미리 읽은 첫 페이지가 있으면 초기 데이터로 심어 첫 렌더부터 카드를 그린다.
 * 좋아요·채팅 수 정렬은 페이지 사이에 순위가 바뀔 수 있어 앞 페이지에 있던 스토리는 뒤에서 뺀다.
 *
 * @param query 필터·정렬
 * @param initialPage 서버 렌더 시점에 읽은 같은 필터·정렬의 첫 페이지
 * @returns 이어 붙인 스토리 목록과 페이지 상태
 */
export function usePublicStories(
  query: StoryListQuery,
  initialPage?: StoryPageResponse,
) {
  const params = { filter: query.filter, sort: query.sort };
  const result = useInfiniteQuery({
    // 무한 목록은 페이지 배열을 캐시하므로 단건 조회 키와 섞이지 않게 접미사를 붙인다.
    queryKey: [...getGetPublicStoriesQueryKey(params), 'infinite'],
    queryFn: ({ pageParam, signal }) =>
      getPublicStories(pageParam ? { ...params, cursor: pageParam } : params, {
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.status === 200
        ? (lastPage.data.nextCursor ?? undefined)
        : undefined,
    initialData: initialPage
      ? {
          pages: [
            { data: initialPage, status: 200 as const, headers: new Headers() },
          ],
          pageParams: [undefined],
        }
      : undefined,
  });

  const seenIds = new Set<string | undefined>();
  const stories: StoryListItem[] = toOrderedStoryListItems(
    result.data?.pages.flatMap((page) =>
      page.status === 200 ? (page.data.items ?? []) : [],
    ) ?? [],
  ).filter((story) => {
    if (seenIds.has(story.id)) {
      return false;
    }

    seenIds.add(story.id);

    return true;
  });

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
