'use client';

import { CreditMark } from '@/components/common/credit-mark';
import { formatCreditAmount } from '@/constants/credit';
import { getTrialRemaining } from '@/features/auth/_shared/utils/guest-trial';
import { isTrialFree } from '@/features/chats/room/utils/chat-turn-cost';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { useTrials } from '@/hooks/use-trials';
import { cn } from '@/lib/utils';

import {
  buildStoryCompletionCreditCostLabel,
  STORY_COMPLETION_CREDIT_COST_LABEL,
} from '../../constants';

/**
 * 추가 정보 단계 하단의 스토리 완성 비용 행. 스토리 제작 체험이 남아 있으면
 * 정가에 취소선을 긋고 "0 이프"를 보인다.
 *
 * 정책 구독을 이 말단에 두어 값이 도착해도 추가 정보 입력까지 다시 그려지지 않게 한다.
 */
export function StoryCompletionCreditCost() {
  const storyCreationCost = useCreditPolicy()?.storyCreationCost;
  const remaining = getTrialRemaining(useTrials(), 'storyCreation');
  const showsStrike = isTrialFree(remaining);
  const pending = storyCreationCost === undefined || remaining === undefined;

  return (
    <dl
      className="flex h-10 w-full items-center justify-between bg-muted px-4 text-sm text-foreground-secondary"
      aria-label={STORY_COMPLETION_CREDIT_COST_LABEL}>
      <dt>{STORY_COMPLETION_CREDIT_COST_LABEL}</dt>
      <dd
        className={cn(
          'flex items-center gap-1 font-bold text-foreground',
          pending && 'animate-pulse',
        )}>
        <CreditMark className="size-3.5" />
        {showsStrike && (
          <s className="font-normal text-foreground-secondary">
            {formatCreditAmount(storyCreationCost)}
          </s>
        )}
        <span>
          {buildStoryCompletionCreditCostLabel(
            formatCreditAmount(showsStrike ? 0 : storyCreationCost),
          )}
        </span>
      </dd>
    </dl>
  );
}
