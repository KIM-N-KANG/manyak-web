'use client';

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
      <ul className="grid grid-cols-3">
        {MAIN_NAVIGATION_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href} className="min-w-0 px-4">
              <Link
                href={item.href}
                replace
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-center py-4',
                  isActive ? 'text-foreground' : 'text-foreground-tertiary',
                )}>
                <Icon className="size-6" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
