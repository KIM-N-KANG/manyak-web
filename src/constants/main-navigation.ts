import type { ComponentType, SVGProps } from 'react';

import {
  ChatRoundFilledIcon,
  ChatRoundOutlineIcon,
  HomeFilledIcon,
  HomeOutlineIcon,
  PlusCircleFilledIcon,
  PlusCircleOutlineIcon,
  UserFilledIcon,
  UserOutlineIcon,
} from '@/components/icons/bottom-navigation-icons';
import { APP_PATH, type MainAppPath } from '@/constants/app-path';

export interface MainNavigationItem {
  href: MainAppPath;
  label: string;
  activeIcon: ComponentType<SVGProps<SVGSVGElement>>;
  inactiveIcon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const MAIN_NAVIGATION_ITEMS: MainNavigationItem[] = [
  {
    href: APP_PATH.MAIN.STORIES,
    label: '홈',
    activeIcon: HomeFilledIcon,
    inactiveIcon: HomeOutlineIcon,
  },
  {
    href: APP_PATH.MAIN.CHATS,
    label: '채팅',
    activeIcon: ChatRoundFilledIcon,
    inactiveIcon: ChatRoundOutlineIcon,
  },
  {
    href: APP_PATH.MAIN.CREATE,
    label: '제작',
    activeIcon: PlusCircleFilledIcon,
    inactiveIcon: PlusCircleOutlineIcon,
  },
  {
    href: APP_PATH.MAIN.MY,
    label: '마이',
    activeIcon: UserFilledIcon,
    inactiveIcon: UserOutlineIcon,
  },
];

/**
 * 경로에 해당하는 메인 내비게이션 라벨을 찾는다.
 *
 * @param pathname 현재 경로
 * @returns 일치하는 항목의 라벨, 없으면 빈 문자열
 */
export function getMainNavigationLabel(pathname: string): string {
  return (
    MAIN_NAVIGATION_ITEMS.find((item) => item.href === pathname)?.label ?? ''
  );
}
