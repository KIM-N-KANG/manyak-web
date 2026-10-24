'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import {
  getGetUsersMeNotificationsQueryKey,
  getUsersMeNotifications,
} from '@/api/generated/endpoints/notifications/notifications';
import type {
  GetUsersMeNotificationsCategory,
  NotificationItem,
} from '@/api/generated/models';

/**
 * 분류별 무한 목록의 쿼리 키. 페이지 배열을 캐시하므로 생성 훅의 단건 키와 섞이지 않게 접미사를 붙인다.
 * 읽음 처리는 이 키의 캐시를 직접 고친다.
 *
 * @param category 알림 분류
 * @returns 쿼리 키
 */
export const getNotificationsInfiniteQueryKey = (
  category: GetUsersMeNotificationsCategory,
) => [...getGetUsersMeNotificationsQueryKey({ category }), 'infinite'] as const;

type UseNotificationsOptions = {
  category: GetUsersMeNotificationsCategory;
  /** 회원 판정이 끝나기 전에는 조회하지 않기 위한 활성화 플래그 */
  enabled: boolean;
};

/**
 * 한 분류의 알림을 커서로 이어 받는 훅.
 *
 * `limit`은 서버 기본값(20건)을 쓰고, 다음 페이지는 응답의 `nextCursor`를 그대로 되돌려 준다.
 *
 * @returns 최신순으로 이어 붙인 알림과 페이지 상태
 */
export function useNotifications({
  category,
  enabled,
}: UseNotificationsOptions) {
  const query = useInfiniteQuery({
    queryKey: getNotificationsInfiniteQueryKey(category),
    queryFn: ({ pageParam, signal }) =>
      getUsersMeNotifications(
        { category, ...(pageParam ? { cursor: pageParam } : {}) },
        { signal },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.status === 200
        ? (lastPage.data.nextCursor ?? undefined)
        : undefined,
    enabled,
  });

  const notifications: NotificationItem[] =
    query.data?.pages.flatMap((page) =>
      page.status === 200 ? (page.data.items ?? []) : [],
    ) ?? [];

  return {
    notifications,
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
