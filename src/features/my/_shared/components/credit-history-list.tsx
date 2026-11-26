'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useInView } from '@/hooks/use-in-view';

import { CREDIT_HISTORY_COPY } from '../constants/credit-history';
import { useCreditTransactions } from '../hooks/use-credit-transactions';
import { CreditHistorySkeleton } from './credit-history-skeleton';
import { CreditTransactionItem } from './credit-transaction-item';

type CreditHistoryListProps = {
  /** 회원 판정이 끝나기 전에는 조회하지 않기 위한 활성화 플래그 */
  enabled: boolean;
  /** 목록을 감싼 스크롤 컨테이너. 목록 끝 감지의 기준이다 */
  scrollElement: HTMLElement | null;
};

/**
 * 이프 사용 내역을 무한 스크롤로 그리는 목록.
 * 목록 끝의 센티널이 스크롤 컨테이너에 보이면 다음 페이지를 불러온다. 첫 조회 실패는 목록
 * 자리에 재시도 안내를, 다음 페이지 실패는 이미 받은 목록 아래에 재시도 버튼만 둔다. 다음
 * 페이지가 실패한 동안에는 센티널이 보여도 자동으로 다시 요청하지 않는다.
 *
 * @see useCreditTransactions
 */
export function CreditHistoryList({
  enabled,
  scrollElement,
}: CreditHistoryListProps) {
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
    <>
      {isPending ? <CreditHistorySkeleton /> : null}

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
            <CreditTransactionItem key={index} transaction={transaction} />
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
    </>
  );
}
