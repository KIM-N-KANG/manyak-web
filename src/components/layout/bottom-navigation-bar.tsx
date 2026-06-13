'use client';

import { ChatFeedback01Icon, ClipboardIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface BottomNavigationItem {
  href: '/my-story' | '/my-chat';
  label: string;
  icon: IconSvgElement;
}

const BOTTOM_NAVIGATION_ITEMS: BottomNavigationItem[] = [
  {
    href: '/my-story',
    label: '스토리',
    icon: ClipboardIcon,
  },
  {
    href: '/my-chat',
    label: '채팅',
    icon: ChatFeedback01Icon,
  },
];

export function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="하단 네비게이션"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background">
      <ul className="grid h-full grid-cols-2">
        {BOTTOM_NAVIGATION_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-xs leading-none',
                  isActive
                    ? 'font-semibold text-foreground'
                    : 'text-foreground-tertiary',
                )}>
                <HugeiconsIcon
                  icon={item.icon}
                  className="size-6"
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
