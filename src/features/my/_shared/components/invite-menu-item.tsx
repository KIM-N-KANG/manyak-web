'use client';

import { AddTeamIcon } from '@hugeicons/core-free-icons';

import { APP_PATH } from '@/constants/app-path';
import { formatCreditAmount } from '@/constants/credit';
import { useCreditPolicy } from '@/hooks/use-credit-policy';

import {
  buildInviteMenuSubLabel,
  INVITE_MENU_LABEL,
} from '../constants/invite-menu-copy';
import { MyMenuItem } from './my-menu-item';

/**
 * 친구 초대 페이지로 가는 메뉴 줄.
 * 마이와 이프 충전(무료 충전)이 같은 줄을 써야 해서 한 컴포넌트로 둔다.
 */
export function InviteMenuItem() {
  const inviteReward = useCreditPolicy()?.inviteReward;

  return (
    <MyMenuItem
      icon={AddTeamIcon}
      label={INVITE_MENU_LABEL}
      subLabel={buildInviteMenuSubLabel(formatCreditAmount(inviteReward))}
      subLabelPending={inviteReward === undefined}
      href={APP_PATH.MY_INVITE}
    />
  );
}
