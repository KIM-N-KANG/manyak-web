import {
  Chatting01Icon,
  ClipboardIcon,
  User02Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';

import { APP_PATH, type MainAppPath } from '@/constants/app-path';

export interface MainNavigationItem {
  href: MainAppPath;
  label: string;
  icon: IconSvgElement;
}

export const MAIN_NAVIGATION_ITEMS: MainNavigationItem[] = [
  {
    href: APP_PATH.MAIN.STORIES,
    label: '스토리',
    icon: ClipboardIcon,
  },
  {
    href: APP_PATH.MAIN.CHATS,
    label: '채팅',
    icon: Chatting01Icon,
  },
  {
    href: APP_PATH.MAIN.MY,
    label: '마이',
    icon: User02Icon,
  },
];

export function getMainNavigationLabel(pathname: string): string {
  return (
    MAIN_NAVIGATION_ITEMS.find((item) => item.href === pathname)?.label ?? ''
  );
}
