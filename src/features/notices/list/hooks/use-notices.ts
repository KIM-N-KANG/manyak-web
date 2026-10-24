'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import {
  getGetNoticesQueryKey,
  getNotices,
} from '@/api/generated/endpoints/notice-controller/notice-controller';
import type { PublicNoticeItemResponse } from '@/api/generated/models';

/** 무한 목록은 페이지 배열을 캐시하므로 헤더 버튼의 단건 조회 키와 섞이지 않게 접미사를 붙인다. */
const NOTICES_QUERY_KEY = [...getGetNoticesQueryKey(), 'infinite'];

/**
 * 공지 목록을 커서로 이어 받는 훅.
 *
 * `limit`은 서버 기본값(20건)을 쓰고, 다음 페이지는 응답의 `nextCursor`를 그대로 되돌려 준다.
 *
 * @returns 최신순으로 이어 붙인 공지와 페이지 상태
 */
export function useNotices() {
  const query = useInfiniteQuery({
    queryKey: NOTICES_QUERY_KEY,
    queryFn: ({ pageParam, signal }) =>
      getNotices(pageParam ? { cursor: pageParam } : undefined, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.status === 200
        ? (lastPage.data.nextCursor ?? undefined)
        : undefined,
  });

  const notices: PublicNoticeItemResponse[] =
    query.data?.pages.flatMap((page) =>
      page.status === 200 ? (page.data.items ?? []) : [],
    ) ?? [];

  return {
    notices,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    /** 다음 페이지 조회가 실패한 상태. 자동 재요청을 멈추고 그 자리 재시도로 넘긴다. */
    isFetchNextPageError: query.isFetchNextPageError,
  };
}
