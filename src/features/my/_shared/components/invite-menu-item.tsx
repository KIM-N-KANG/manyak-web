import { AddTeamIcon } from '@hugeicons/core-free-icons';

import { APP_PATH } from '@/constants/app-path';

import { INVITE_MENU_COPY } from '../constants/invite-menu-copy';
import { MyMenuItem } from './my-menu-item';

/**
 * 친구 초대 페이지로 가는 메뉴 줄.
 * 마이와 이프 충전(무료 충전)이 같은 줄을 써야 해서 한 컴포넌트로 둔다.
 */
export function InviteMenuItem() {
  return (
    <MyMenuItem
      icon={AddTeamIcon}
      label={INVITE_MENU_COPY.label}
      subLabel={INVITE_MENU_COPY.subLabel}
      href={APP_PATH.MY_INVITE}
    />
  );
}
