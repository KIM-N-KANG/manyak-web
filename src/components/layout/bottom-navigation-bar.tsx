'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { MAIN_NAVIGATION_ITEMS } from '@/constants/main-navigation';

export function BottomNavigationBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="하단 네비게이션"
      className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4">
        {MAIN_NAVIGATION_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = isActive ? item.activeIcon : item.inactiveIcon;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                replace
                // 탭 목록의 스크롤 위치는 레이아웃이 복원하므로 Next가 새 세그먼트를 맨 위로 끌어올리지 않게 한다.
                scroll={false}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-foreground">
                <Icon className="size-6" aria-hidden="true" />
                <span className="text-xs leading-4 font-medium">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
