import type { ComponentType, SVGProps } from 'react';

import {
  ChatRoundFilledIcon,
  ClipboardFilledIcon,
  UserFilledIcon,
} from '@/components/layout/bottom-navigation-icons';
import { APP_PATH, type MainAppPath } from '@/constants/app-path';

export interface MainNavigationItem {
  href: MainAppPath;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const MAIN_NAVIGATION_ITEMS: MainNavigationItem[] = [
  {
    href: APP_PATH.MAIN.STORIES,
    label: '스토리',
    icon: ClipboardFilledIcon,
  },
  {
    href: APP_PATH.MAIN.CHATS,
    label: '채팅',
    icon: ChatRoundFilledIcon,
  },
  {
    href: APP_PATH.MAIN.MY,
    label: '마이',
    icon: UserFilledIcon,
  },
];

export function getMainNavigationLabel(pathname: string): string {
  return (
    MAIN_NAVIGATION_ITEMS.find((item) => item.href === pathname)?.label ?? ''
  );
}
