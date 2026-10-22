'use client';

import { CreditMark } from '@/components/common/credit-mark';
import { Badge } from '@/components/ui/badge';
import { formatCreditAmount } from '@/constants/credit';
import { getTrialRemaining } from '@/features/auth/_shared/utils/guest-trial';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { useTrials } from '@/hooks/use-trials';
import { cn } from '@/lib/utils';

import { buildChatTurnCreditCostLabel } from '../../constants';
import { calcChatTurnCost } from '../../utils/chat-turn-cost';

type ChatTurnCreditCostProps = {
  /** 실시간 이미지 비용을 턴 비용에 합산해 보일지 여부 */
  withRealtimeImage?: boolean;
  /** 고급 모델 비용으로 보일지 여부 */
  advancedModel?: boolean;
  className?: string;
};

export function ChatTurnCreditCost({
  withRealtimeImage = false,
  advancedModel = false,
  className,
}: ChatTurnCreditCostProps) {
  const trials = useTrials();
  const policy = useCreditPolicy();
  const turnRemaining = getTrialRemaining(trials, 'chatTurn');
  const imageRemaining = getTrialRemaining(trials, 'chatImage');

  const { full, discounted } = calcChatTurnCost({
    chatTurnCost: policy?.chatTurnCost,
    chatImageCost: policy?.chatImageCost,
    withRealtimeImage,
    advancedModel,
    turnRemaining,
    imageRemaining,
  });
  // 체험이 남아 있으면 정가에 취소선을 긋고 오른쪽에 체험 적용가를 보인다.
  const showsStrike =
    full !== undefined && discounted !== undefined && discounted < full;

  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1 text-foreground-secondary',
        discounted === undefined && 'animate-pulse',
        className,
      )}>
      <CreditMark className="size-3" />
      {showsStrike && <s>{formatCreditAmount(full)}</s>}
      <span>
        {buildChatTurnCreditCostLabel(formatCreditAmount(discounted))}
      </span>
    </Badge>
  );
}
