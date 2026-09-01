'use client';

import { formatCreditAmount } from '@/constants/credit';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { cn } from '@/lib/utils';

import {
  buildStoryCompletionCreditCostLabel,
  STORY_COMPLETION_CREDIT_COST_LABEL,
} from '../../constants';

/**
 * 추가 정보 단계 하단의 스토리 완성 비용 행.
 *
 * 정책 구독을 이 말단에 두어 값이 도착해도 추가 정보 입력까지 다시 그려지지 않게 한다.
 */
export function StoryCompletionCreditCost() {
  const storyCreationCost = useCreditPolicy()?.storyCreationCost;

  return (
    <dl
      className="flex h-10 w-full items-center justify-between bg-muted px-4 text-sm text-foreground-secondary"
      aria-label={STORY_COMPLETION_CREDIT_COST_LABEL}>
      <dt>{STORY_COMPLETION_CREDIT_COST_LABEL}</dt>
      <dd
        className={cn(
          'font-bold text-foreground',
          storyCreationCost === undefined && 'animate-pulse',
        )}>
        {buildStoryCompletionCreditCostLabel(
          formatCreditAmount(storyCreationCost),
        )}
      </dd>
    </dl>
  );
}
