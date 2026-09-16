'use client';

import { CreditMark } from '@/components/common/credit-mark';
import { formatCreditAmount } from '@/constants/credit';
import {
  getTrialRemaining,
  showsTrialRemaining,
} from '@/features/auth/_shared/utils/guest-trial';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { useTrials } from '@/hooks/use-trials';
import { cn } from '@/lib/utils';

import {
  buildChatTurnCreditCostLabel,
  buildTrialRemainingLabel,
  formatTrialRemaining,
} from '../../constants';
import { calcChatTurnCost } from '../../utils/chat-turn-cost';

type ChatTurnCreditCostProps = {
  /** 실시간 이미지 비용을 턴 비용에 합산해 보일지 여부 */
  withRealtimeImage?: boolean;
  /** 회원 여부. 게스트는 잔여 횟수 대신 정가 취소선과 체험 적용가를 보인다 */
  isMember: boolean;
  className?: string;
};

export function ChatTurnCreditCost({
  withRealtimeImage = false,
  isMember,
  className,
}: ChatTurnCreditCostProps) {
  const trials = useTrials();
  const policy = useCreditPolicy();
  const turnRemaining = getTrialRemaining(trials, 'chatTurn');
  const imageRemaining = getTrialRemaining(trials, 'chatImage');
  const baseClassName =
    'flex shrink-0 items-center gap-1 text-xs text-foreground-secondary';

  if (isMember && showsTrialRemaining(isMember, turnRemaining)) {
    return (
      <span
        className={cn(
          baseClassName,
          turnRemaining === undefined && 'animate-pulse',
          className,
        )}>
        {buildTrialRemainingLabel(formatTrialRemaining(turnRemaining))}
      </span>
    );
  }

  const { full, discounted } = calcChatTurnCost({
    chatTurnCost: policy?.chatTurnCost,
    chatImageCost: policy?.chatImageCost,
    withRealtimeImage,
    turnRemaining,
    imageRemaining,
  });
  const showsStrike =
    !isMember && full !== undefined && discounted !== undefined
      ? discounted < full
      : false;

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
