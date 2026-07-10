'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { MAIN_NAVIGATION_ITEMS } from '@/constants/main-navigation';
import { cn } from '@/lib/utils';

export function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="하단 네비게이션"
      className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="grid h-16 grid-cols-3">
        {MAIN_NAVIGATION_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href} className="min-w-0 px-4">
              <Link
                href={item.href}
                replace
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
