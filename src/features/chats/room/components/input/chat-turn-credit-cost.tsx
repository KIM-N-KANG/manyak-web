'use client';

import { CreditMark } from '@/components/common/credit-mark';
import { formatCreditAmount } from '@/constants/credit';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { cn } from '@/lib/utils';

import { buildChatTurnCreditCostLabel } from '../../constants';

export function ChatTurnCreditCost() {
  const chatTurnCost = useCreditPolicy()?.chatTurnCost;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 text-xs text-foreground-secondary',
        chatTurnCost === undefined && 'animate-pulse',
      )}>
      <CreditMark className="size-3" />
      {buildChatTurnCreditCostLabel(formatCreditAmount(chatTurnCost))}
    </span>
  );
}
