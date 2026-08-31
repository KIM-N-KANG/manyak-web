'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { APP_PATH } from '@/constants/app-path';
import { useInView } from '@/hooks/use-in-view';

import { CREDIT_HISTORY_COPY } from '../constants';
import { useCreditTransactions } from '../hooks/use-credit-transactions';
import { CreditHistorySkeleton } from './credit-history-skeleton';
import { CreditTransactionItem } from './credit-transaction-item';

/**
 * 이프 내역. 잔액 상자 하나와 그 아래 원장 목록뿐이고 분류 필터는 두지 않는다.
 *
 * 잔액과 목록은 출처가 다르다 — 잔액 정본은 프로필(`GET /auth/me`)이라 내역 금액을 합산하지 않는다.
 * 구매는 목록에서 빠지고 만료 회수는 실제 만료보다 늦게 기록돼 합계가 잔액과 어긋난다.
 */
export function CreditHistoryScreen() {
  const router = useRouter();
  const { status } = useSession();
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [sentinelElement, setSentinelElement] = useState<HTMLDivElement | null>(
    null,
  );

  const isAuthenticated = status === 'authenticated';

  const { data } = useMe({
    query: { refetchOnMount: 'always', enabled: isAuthenticated },
  });
  const balance = data?.status === 200 ? data.data.creditBalance : undefined;

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
  } = useCreditTransactions({ enabled: isAuthenticated });

  const hasTransactions = transactions.length > 0;

  const isSentinelInView = useInView({
    target: sentinelElement,
    root: scrollElement,
    initialInView: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [status, router]);

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
    <main
      ref={setScrollElement}
      className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain p-4">
      <section
        className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4 text-center"
        aria-label={CREDIT_HISTORY_COPY.balanceLabel}>
        <span className="text-sm font-semibold text-foreground-secondary">
          {CREDIT_HISTORY_COPY.balanceLabel}
        </span>
        {balance === undefined ? (
          <Skeleton className="h-7 w-24 bg-foreground/5" />
        ) : (
          <span className="text-xl font-bold tabular-nums">
            {balance.toLocaleString()}
          </span>
        )}
      </section>

      <div className="mt-8 flex flex-col">
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

        {hasNextPage ? (
          <div ref={setSentinelElement} aria-hidden="true" />
        ) : null}
      </div>
    </main>
  );
}
