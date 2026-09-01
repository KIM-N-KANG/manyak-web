'use client';

import { DrawerTitle } from '@/components/ui/drawer';
import { formatCreditAmount } from '@/constants/credit';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { cn } from '@/lib/utils';

import { buildInviteRewardCopy } from '../constants';

/**
 * 초대 온보딩 바텀 시트의 제목.
 *
 * 정책 구독을 이 말단에 두어 값이 도착해도 시트 안의 코드 입력 폼까지 다시 그려지지 않게 한다.
 */
export function InviteOnboardingTitle() {
  const inviteReward = useCreditPolicy()?.inviteReward;

  return (
    <DrawerTitle
      className={cn(
        'text-xl leading-snug font-bold whitespace-pre-line',
        inviteReward === undefined && 'animate-pulse',
      )}>
      {buildInviteRewardCopy(formatCreditAmount(inviteReward)).onboardingTitle}
    </DrawerTitle>
  );
}
