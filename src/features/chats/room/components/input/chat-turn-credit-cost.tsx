'use client';

import { CreditMark } from '@/components/common/credit-mark';
import { formatCreditAmount } from '@/constants/credit';
import { getTrialRemaining } from '@/features/auth/_shared/utils/guest-trial';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { useTrials } from '@/hooks/use-trials';
import { cn } from '@/lib/utils';

import { buildChatTurnCreditCostLabel } from '../../constants';
import { calcChatTurnCost } from '../../utils/chat-turn-cost';

type ChatTurnCreditCostProps = {
  /** 고른 채팅 모델의 턴 이프 비용(모르면 undefined) */
  turnCost: number | undefined;
  /** 그 모델의 코드. 턴 체험은 체험 모델에만 적용된다 */
  modelCode: string | undefined;
  /** 실시간 이미지 비용을 턴 비용에 합산해 보일지 여부 */
  withRealtimeImage?: boolean;
  className?: string;
};

/**
 * 이번 턴에 낼 이프를 보이는 배지. 체험이 남아 정가보다 싸지면 정가에 취소선을 긋고 체험 적용가를 함께 보이며,
 * 정책이나 체험 잔여를 아직 몰라 적용가가 정해지지 않았으면 pulse로 표시한다.
 *
 * @see calcChatTurnCost
 */
export function ChatTurnCreditCost({
  turnCost,
  modelCode,
  withRealtimeImage = false,
  className,
}: ChatTurnCreditCostProps) {
  const trials = useTrials();
  const policy = useCreditPolicy();
  const turnRemaining = getTrialRemaining(trials, 'chatTurn');
  const imageRemaining = getTrialRemaining(trials, 'chatImage');
  const baseClassName =
    'flex shrink-0 items-center gap-1 text-xs text-foreground-secondary';

  const { full, discounted } = calcChatTurnCost({
    turnCost,
    modelCode,
    chatImageCost: policy?.chatImageCost,
    withRealtimeImage,
    turnRemaining,
    imageRemaining,
  });
  // 체험이 남아 있으면 정가에 취소선을 긋고 오른쪽에 체험 적용가를 보인다.
  const showsStrike =
    full !== undefined && discounted !== undefined && discounted < full;

  return (
    <span
      className={cn(
        baseClassName,
        discounted === undefined && 'animate-pulse',
        className,
      )}>
      <CreditMark className="size-3" />
      {showsStrike && <s>{formatCreditAmount(full)}</s>}
      <span>
        {buildChatTurnCreditCostLabel(formatCreditAmount(discounted))}
      </span>
    </span>
  );
}
