'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';
import { MAIN_NAVIGATION_ITEMS } from '@/constants/main-navigation';
import { forgetExploreStories } from '@/features/stories/_shared/utils/explore-stories-query';
import { rememberScrollPosition } from '@/hooks/use-scroll-restoration';

/**
 * 메인 탭 사이를 오가는 하단 네비게이션. 탭 이동은 기록을 쌓지 않도록 `replace`하고, 스크롤 복원을
 * 화면에 맡기려고 `scroll={false}`로 둔다.
 *
 * @remarks
 * 다른 탭에서 탐색 탭으로 들어오면 탐색 목록 캐시를 버리고 저장된 스크롤 위치를 0으로 돌려, 새 순서의
 * 목록을 맨 위부터 보여준다. 상세에서 뒤로 돌아올 때는 이 경로를 거치지 않아 보던 순서와 위치가 남는다.
 */
export function BottomNavigationBar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  return (
    <nav
      aria-label="하단 네비게이션"
      className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {MAIN_NAVIGATION_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = isActive ? item.activeIcon : item.inactiveIcon;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                replace
                scroll={false}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (item.href === APP_PATH.MAIN.EXPLORE && !isActive) {
                    forgetExploreStories(queryClient);
                    rememberScrollPosition(APP_PATH.MAIN.EXPLORE, 0);
                  }
                }}
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
