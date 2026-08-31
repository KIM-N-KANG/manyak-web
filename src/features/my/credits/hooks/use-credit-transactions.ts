'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import {
  getGetMyCreditTransactionsQueryKey,
  getMyCreditTransactions,
} from '@/api/generated/endpoints/credits/credits';
import type { CreditTransactionResponse } from '@/api/generated/models';

/** 무한 목록은 페이지 배열을 캐시하므로 단건 조회 키와 섞이지 않게 접미사를 붙인다. */
const CREDIT_TRANSACTIONS_QUERY_KEY = [
  ...getGetMyCreditTransactionsQueryKey(),
  'infinite',
];

type UseCreditTransactionsOptions = {
  /** 회원 판정이 끝나기 전에는 조회하지 않기 위한 활성화 플래그 */
  enabled: boolean;
};

/**
 * 이프 내역을 커서로 이어 받는 훅.
 *
 * `limit`·`type`은 서버 기본값(50건·전체)을 쓰고, 다음 페이지는 응답의 `nextCursor`를
 * 그대로 되돌려 준다 — 커서는 서버가 봉인한 불투명 문자열이라 파싱하거나 조립하지 않는다.
 *
 * @param options 조회 활성화 여부
 * @returns 최신순으로 이어 붙인 내역과 페이지 상태
 */
export function useCreditTransactions({
  enabled,
}: UseCreditTransactionsOptions) {
  const query = useInfiniteQuery({
    queryKey: CREDIT_TRANSACTIONS_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      getMyCreditTransactions(pageParam ? { cursor: pageParam } : undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.status === 200
        ? (lastPage.data.nextCursor ?? undefined)
        : undefined,
    enabled,
  });

  const transactions: CreditTransactionResponse[] =
    query.data?.pages.flatMap((page) =>
      page.status === 200 ? (page.data.items ?? []) : [],
    ) ?? [];

  return {
    transactions,
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
