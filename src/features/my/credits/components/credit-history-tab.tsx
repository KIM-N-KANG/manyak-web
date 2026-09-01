'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useInView } from '@/hooks/use-in-view';

import { CREDIT_HISTORY_COPY } from '../constants';
import { useCreditTransactions } from '../hooks/use-credit-transactions';
import { CreditHistorySkeleton } from './credit-history-skeleton';
import { CreditTransactionItem } from './credit-transaction-item';

type CreditHistoryTabProps = {
  /** 회원 판정이 끝나기 전에는 조회하지 않기 위한 활성화 플래그 */
  enabled: boolean;
};

/**
 * 이프 원장 목록. 분류 필터는 두지 않는다.
 *
 * 잔액과 목록은 출처가 다르다 — 잔액 정본은 프로필(`GET /auth/me`)이라 내역 금액을 합산하지 않는다.
 * 구매는 목록에서 빠지고 만료 회수는 실제 만료보다 늦게 기록돼 합계가 잔액과 어긋난다.
 */
export function CreditHistoryTab({ enabled }: CreditHistoryTabProps) {
  // 잔액 상자·탭 줄은 셸에 고정돼 있어 이 탭이 자기 스크롤러를 소유한다.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );

  const {
    transactions,
    isPending,
    isError,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useCreditTransactions({ enabled });

  const hasTransactions = transactions.length > 0;

  const isSentinelInView = useInView({
    target: sentinelElement,
    root: scrollElement,
    initialInView: false,
  });

  // 목록 끝에 닿으면 다음 커서를 잇는다. 실패한 뒤에는 자동으로 다시 요청하지 않고
  // 그 자리 재시도 버튼에 넘긴다 — 끝에 머무는 동안 같은 실패를 반복하게 되기 때문이다.
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
    <div
      ref={setScrollElement}
      className="flex h-full scroll-fade-b flex-col overflow-y-auto overscroll-contain px-4 py-2">
      {isPending ? <CreditHistorySkeleton /> : null}

      {/* 다음 페이지 실패도 쿼리 전체를 error로 만들므로, 첫 조회 실패는 목록이 비었을 때로 좁힌다. */}
      {isError && !hasTransactions ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-foreground-secondary">
            {CREDIT_HISTORY_COPY.loadFailed}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isFetching}
            onClick={() => void refetch()}>
            {isFetching
              ? CREDIT_HISTORY_COPY.retrying
              : CREDIT_HISTORY_COPY.retry}
          </Button>
        </div>
      ) : null}

      {!isPending && !isError && !hasTransactions ? (
        <p className="py-8 text-center text-foreground-secondary">
          {CREDIT_HISTORY_COPY.empty}
        </p>
      ) : null}

      {hasTransactions ? (
        <ul className="flex flex-col">
          {transactions.map((transaction, index) => (
            <CreditTransactionItem
              // 원장 줄에는 안정된 식별자가 없고 목록은 뒤로만 이어 붙는다.
              key={index}
              transaction={transaction}
            />
          ))}
        </ul>
      ) : null}

      {isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Spinner aria-label={CREDIT_HISTORY_COPY.loading} />
        </div>
      ) : null}

      {isFetchNextPageError && !isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void fetchNextPage()}>
            {CREDIT_HISTORY_COPY.retry}
          </Button>
        </div>
      ) : null}

      {hasNextPage ? <div ref={setSentinelElement} aria-hidden="true" /> : null}
    </div>
  );
}
