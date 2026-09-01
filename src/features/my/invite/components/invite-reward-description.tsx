'use client';

import { formatCreditAmount } from '@/constants/credit';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { cn } from '@/lib/utils';

import { buildInviteRewardCopy } from '../constants';

/**
 * 초대 화면 상단의 보상 안내 문구.
 *
 * 정책 구독을 이 말단에 두어 값이 도착해도 초대 코드 입력 폼까지 다시 그려지지 않게 한다 —
 * 화면 전체가 구독하면 입력 중이던 코드가 초기화된다.
 */
export function InviteRewardDescription() {
  const inviteReward = useCreditPolicy()?.inviteReward;

  return (
    <p
      className={cn(
        'text-foreground-secondary',
        inviteReward === undefined && 'animate-pulse',
      )}>
      {buildInviteRewardCopy(formatCreditAmount(inviteReward)).pageDescription}
    </p>
  );
}
