'use client';

import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatCreditAmount } from '@/constants/credit';

import { CREDIT_ORDER_COPY } from '../constants';
import {
  useCreditOrderConfirmation,
  usePendingCreditOrderId,
} from '../hooks/use-credit-order-confirmation';

/** 결제창에서 돌아왔을 때 잔액 아래에 붙는 확인 카드. 대기 주문이 없으면 아무것도 그리지 않는다. */
export function CreditOrderStatusCard() {
  const orderId = usePendingCreditOrderId();

  // 주문이 바뀌면 폴링 상태도 처음부터 시작하도록 주문 단위로 마운트한다.
  return orderId ? <CreditOrderStatus key={orderId} orderId={orderId} /> : null;
}

function CreditOrderStatus({ orderId }: { orderId: string }) {
  const { confirmation, retry, dismiss } = useCreditOrderConfirmation(orderId);

  const isChecking = confirmation.kind === 'checking';
  const canRetry =
    confirmation.kind === 'timeout' || confirmation.kind === 'failed';

  const message = (() => {
    switch (confirmation.kind) {
      case 'checking':
        return CREDIT_ORDER_COPY.checking;
      case 'completed':
        return CREDIT_ORDER_COPY.completed(
          formatCreditAmount(confirmation.totalCredits),
        );
      case 'refunded':
        return CREDIT_ORDER_COPY.refunded;
      case 'not-found':
        return CREDIT_ORDER_COPY.notFound;
      case 'timeout':
        return CREDIT_ORDER_COPY.timeout;
      case 'failed':
        return CREDIT_ORDER_COPY.failed;
    }
  })();

  return (
    <section
      role="status"
      aria-label={CREDIT_ORDER_COPY.title}
      className="mx-4 mt-4 flex items-center gap-3 rounded-lg bg-muted p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">{message}</p>
        {isChecking && (
          <p className="text-xs text-foreground-secondary">
            {CREDIT_ORDER_COPY.checkingHint}
          </p>
        )}
        {canRetry && (
          <p className="text-xs text-foreground-secondary">
            {CREDIT_ORDER_COPY.retryHint}
          </p>
        )}
      </div>
      {isChecking ? (
        <Spinner className="shrink-0 text-primary" />
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          {canRetry && (
            <Button type="button" size="sm" variant="secondary" onClick={retry}>
              {CREDIT_ORDER_COPY.retry}
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={CREDIT_ORDER_COPY.dismiss}
            onClick={dismiss}>
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
          </Button>
        </div>
      )}
    </section>
  );
}
