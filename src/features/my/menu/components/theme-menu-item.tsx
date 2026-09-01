'use client';

import { useSyncExternalStore } from 'react';

import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';
import { type IconSvgElement } from '@hugeicons/react';
import { useTheme } from 'next-themes';

import { MyMenuItem } from '@/features/my/_shared/components/my-menu-item';

const THEME_ORDER = ['system', 'light', 'dark'] as const;

type ThemeOption = (typeof THEME_ORDER)[number];

const THEME_OPTION_META = {
  system: { icon: ComputerIcon, description: '시스템 설정' },
  light: { icon: Sun03Icon, description: '라이트 모드' },
  dark: { icon: Moon02Icon, description: '다크 모드' },
} satisfies Record<ThemeOption, { icon: IconSvgElement; description: string }>;

/**
 * 아무 것도 구독하지 않는 useSyncExternalStore용 빈 구독 함수를 만든다.
 *
 * @returns 구독 해제용 no-op 함수
 */
const emptySubscribe = () => () => {};

export function ThemeMenuItem() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const currentTheme: ThemeOption =
    hydrated && THEME_ORDER.includes(theme as ThemeOption)
      ? (theme as ThemeOption)
      : 'system';
  const { icon, description } = THEME_OPTION_META[currentTheme];

  const handleClick = () => {
    const nextIndex =
      (THEME_ORDER.indexOf(currentTheme) + 1) % THEME_ORDER.length;

    setTheme(THEME_ORDER[nextIndex]);
  };

  return (
    <MyMenuItem
      icon={icon}
      label="테마 변경"
      trailingText={description}
      onClick={handleClick}
    />
  );
}
