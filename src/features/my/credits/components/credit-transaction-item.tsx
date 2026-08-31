import type { CreditTransactionResponse } from '@/api/generated/models';
import { cn } from '@/lib/utils';

import {
  formatCreditAmount,
  formatCreditDateLine,
  isEarnedCredit,
  resolveCreditReasonLabel,
  resolveCreditSubtitle,
} from '../utils/credit-transaction-display';

type CreditTransactionItemProps = {
  transaction: CreditTransactionResponse;
};

/** 내역 한 줄. 사유·대상 스토리·날짜가 왼쪽에, 금액이 오른쪽에 온다. */
export function CreditTransactionItem({
  transaction,
}: CreditTransactionItemProps) {
  const subtitle = resolveCreditSubtitle(transaction);
  const dateLine = formatCreditDateLine(transaction);
  const isEarned = isEarnedCredit(transaction);

  return (
    <li className="flex items-center gap-2 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">
          {resolveCreditReasonLabel(transaction.reason)}
        </span>
        {subtitle === null ? null : (
          <span className="truncate text-sm text-foreground-secondary">
            {subtitle}
          </span>
        )}
        {dateLine === null ? null : (
          <span className="text-xs text-foreground-tertiary">{dateLine}</span>
        )}
      </div>
      <span
        className={cn(
          'font-semibold tabular-nums',
          isEarned && 'text-primary',
        )}>
        {formatCreditAmount(transaction)}
      </span>
    </li>
  );
}
