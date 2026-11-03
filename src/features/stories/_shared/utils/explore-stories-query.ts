import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { getGetExploreStoriesQueryKey } from '@/api/generated/endpoints/stories/stories';

/** 탐색 목록의 무한 조회 캐시 키. 단건 조회 키와 섞이지 않게 접미사를 붙인다. */
export const EXPLORE_STORIES_QUERY_KEY = [
  ...getGetExploreStoriesQueryKey(),
  'infinite',
] as const;

/**
 * 탐색 목록을 버려 다음 진입이 `cursor` 없는 새 순서로 시작하게 한다.
 * 다른 탭에서 하단 탭으로 들어올 때 부르고, 상세에서 뒤로 돌아올 때는 부르지 않아 보던 순서를 유지한다.
 *
 * @param queryClient 앱 쿼리 클라이언트
 */
export function forgetExploreStories(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: EXPLORE_STORIES_QUERY_KEY });
}

/**
 * 당겨서 새로고침으로 탐색 목록을 새로 섞는다.
 *
 * 무한 조회를 그대로 다시 읽으면 불러온 페이지 수만큼 차례로 요청해 오래 걸린다. 첫 페이지만 남긴 뒤 다시 읽어
 * `cursor` 없는 새 순서의 첫 페이지 하나만 받는다. 응답 전까지 첫 페이지는 화면에 남고 실패는 쿼리 상태로 남는다.
 *
 * @param queryClient 앱 쿼리 클라이언트
 * @returns 다시 읽기가 끝나면 resolve하는 Promise
 */
export function reshuffleExploreStories(
  queryClient: QueryClient,
): Promise<void> {
  queryClient.setQueryData<InfiniteData<unknown, string | undefined>>(
    EXPLORE_STORIES_QUERY_KEY,
    (data) =>
      data && {
        pages: data.pages.slice(0, 1),
        pageParams: data.pageParams.slice(0, 1),
      },
  );

  return queryClient.refetchQueries({ queryKey: EXPLORE_STORIES_QUERY_KEY });
}
