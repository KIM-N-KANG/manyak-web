'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { getMeQueryKey } from '@/api/generated/endpoints/auth/auth';
import {
  get as getCreditOrder,
  getGetQueryKey,
  useGet as useCreditOrder,
} from '@/api/generated/endpoints/credits/credits';
import { queryFnWithoutAbortSignal } from '@/lib/query-client';

import {
  CREDIT_ORDER_POLL_INTERVAL_MS,
  type CreditOrderConfirmation,
  resolveCreditOrderConfirmation,
} from '../utils/credit-order-confirmation';
import {
  clearPendingCreditOrder,
  getPendingCreditOrderSnapshot,
  getServerPendingCreditOrderSnapshot,
  subscribePendingCreditOrder,
} from '../utils/pending-credit-order-storage';

/**
 * 결제창으로 나가기 전 남겨 둔 주문 ID를 구독한다.
 *
 * @returns 대기 주문 ID. 없거나 만료됐으면 null
 */
export function usePendingCreditOrderId(): string | null {
  return useSyncExternalStore(
    subscribePendingCreditOrder,
    getPendingCreditOrderSnapshot,
    getServerPendingCreditOrderSnapshot,
  );
}

/**
 * 복귀한 주문을 완료될 때까지 폴링하고 결과를 화면 상태로 돌려주는 훅.
 *
 * 완료되면 잔액 정본(me)을 무효화한다. 대기 주문 기록은 카드를 닫거나 화면을 떠날 때
 * 지운다 — 폴링이 끝나자마자 지우면 결과 문구를 보여 줄 새가 없다.
 *
 * @param orderId 확인할 주문 ID
 * @returns 확인 상태, 다시 확인, 닫기
 */
export function useCreditOrderConfirmation(orderId: string) {
  const queryClient = useQueryClient();
  const queryKey = getGetQueryKey(orderId);

  const { data, error } = useCreditOrder(orderId, {
    query: {
      queryKey,
      // StrictMode 재마운트가 첫 조회를 취소하고 다시 보내면 조회 횟수가 어긋난다.
      queryFn: queryFnWithoutAbortSignal(() => getCreditOrder(orderId)),
      staleTime: 0,
      refetchInterval: (query) =>
        resolveCreditOrderConfirmation({
          data: query.state.data,
          error: query.state.error,
          attempts: query.state.dataUpdateCount,
        }).kind === 'checking'
          ? CREDIT_ORDER_POLL_INTERVAL_MS
          : false,
    },
  });

  const confirmation: CreditOrderConfirmation = resolveCreditOrderConfirmation({
    data,
    error,
    attempts: queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0,
  });

  const isSettled =
    confirmation.kind === 'completed' ||
    confirmation.kind === 'refunded' ||
    confirmation.kind === 'not-found';

  useEffect(() => {
    if (confirmation.kind === 'completed') {
      void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
    }
  }, [confirmation.kind, queryClient]);

  // 결과가 난 주문은 화면을 떠날 때 기록을 지워 다음 진입에서 다시 묻지 않는다.
  const isSettledRef = useRef(false);

  useEffect(() => {
    isSettledRef.current = isSettled;
  }, [isSettled]);

  useEffect(
    () => () => {
      if (isSettledRef.current) {
        clearPendingCreditOrder();
      }
    },
    [],
  );

  return {
    confirmation,
    // 상태를 초기화해야 조회 횟수가 0부터 다시 세어져 폴링이 처음처럼 이어진다.
    retry: () => void queryClient.resetQueries({ queryKey }),
    dismiss: clearPendingCreditOrder,
  };
}
