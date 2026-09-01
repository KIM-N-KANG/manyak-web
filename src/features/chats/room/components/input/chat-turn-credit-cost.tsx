'use client';

import { formatCreditAmount } from '@/constants/credit';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { cn } from '@/lib/utils';

import { buildChatTurnCreditCostLabel } from '../../constants';

export function ChatTurnCreditCost() {
  const chatTurnCost = useCreditPolicy()?.chatTurnCost;

  return (
    <span
      className={cn(
        'shrink-0 text-xs text-foreground-secondary',
        chatTurnCost === undefined && 'animate-pulse',
      )}>
      {buildChatTurnCreditCostLabel(formatCreditAmount(chatTurnCost))}
    </span>
  );
}
