'use client';

import { CreditMark } from '@/components/common/credit-mark';
import { formatCreditAmount } from '@/constants/credit';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { cn } from '@/lib/utils';

import { buildChatTurnCreditCostLabel } from '../../constants';

type ChatTurnCreditCostProps = {
  /** 실시간 이미지 비용을 턴 비용에 합산해 보일지 여부 */
  withRealtimeImage?: boolean;
  className?: string;
};

/**
 * 채팅 한 턴의 이프 비용 배지. 정책값을 아직 못 받았으면 자리표시로 펄스한다.
 * 실시간 이미지를 합산할 때는 두 정책값이 모두 있어야 숫자를 보인다.
 */
export function ChatTurnCreditCost({
  withRealtimeImage = false,
  className,
}: ChatTurnCreditCostProps) {
  const policy = useCreditPolicy();
  const chatTurnCost = policy?.chatTurnCost;
  const chatImageCost = policy?.chatImageCost;
  const amount =
    chatTurnCost === undefined
      ? undefined
      : withRealtimeImage
        ? chatImageCost === undefined
          ? undefined
          : chatTurnCost + chatImageCost
        : chatTurnCost;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 text-xs text-foreground-secondary',
        amount === undefined && 'animate-pulse',
        className,
      )}>
      <CreditMark className="size-3" />
      {buildChatTurnCreditCostLabel(formatCreditAmount(amount))}
    </span>
  );
}
