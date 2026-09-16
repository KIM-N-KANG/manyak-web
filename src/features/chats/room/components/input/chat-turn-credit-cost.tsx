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

type ChatTurnCreditCostProps = {
  /** 실시간 이미지 비용을 턴 비용에 합산해 보일지 여부 */
  withRealtimeImage?: boolean;
  /** 회원 여부. 게스트는 이프 비용 대신 잔여 체험 횟수만 보인다 */
  isMember: boolean;
  className?: string;
};

/**
 * 전송 버튼 옆의 채팅 턴 비용 배지. 채팅 턴 체험이 남아 있으면 "잔여 체험 횟수: n"을,
 * 회원이 체험을 다 쓰면 이프 비용을 보인다. 값을 아직 못 받았으면 자리표시로 펄스한다.
 * 실시간 이미지를 합산할 때 이미지 체험이 남아 있으면 이미지 비용은 더하지 않는다.
 */
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

  if (showsTrialRemaining(isMember, turnRemaining)) {
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

  const chatTurnCost = policy?.chatTurnCost;
  const chatImageCost = policy?.chatImageCost;
  const includesImageCost =
    withRealtimeImage && !showsTrialRemaining(isMember, imageRemaining);
  const amount =
    chatTurnCost === undefined
      ? undefined
      : includesImageCost
        ? chatImageCost === undefined
          ? undefined
          : chatTurnCost + chatImageCost
        : chatTurnCost;

  return (
    <span
      className={cn(
        baseClassName,
        (amount === undefined || turnRemaining === undefined) &&
          'animate-pulse',
        className,
      )}>
      <CreditMark className="size-3" />
      {buildChatTurnCreditCostLabel(formatCreditAmount(amount))}
    </span>
  );
}
