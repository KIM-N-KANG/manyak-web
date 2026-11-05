'use client';

import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { getMainNavigationLabel } from '@/constants/main-navigation';
import { NotificationHeaderButton } from '@/features/notifications/_shared/components/notification-header-button';
import { EXPLORE_SEARCH_COPY } from '@/features/stories/_shared/constants/explore-search';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import { ManyakLogo } from './manyak-logo';

export function MainHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const title = getMainNavigationLabel(pathname);
  const isHome = pathname === APP_PATH.MAIN.STORIES;
  const isExplore = pathname === APP_PATH.MAIN.EXPLORE;

  const isNoticeTab =
    isHome ||
    pathname === APP_PATH.MAIN.CHATS ||
    pathname === APP_PATH.MAIN.STUDIO ||
    isExplore;
  const showLoginButton = status === 'unauthenticated' && isNoticeTab;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 bg-background px-4">
      {isHome ? <ManyakLogo className="h-6 w-auto text-primary" /> : null}
      <h1 className={cn('text-xl font-semibold', isHome && 'sr-only')}>
        {title}
      </h1>
      {/* 홈, 채팅, 제작, 탐색 헤더의 오른쪽 묶음. 게스트는 종 버튼(공지사항) 오른쪽 끝에 로그인 버튼을, 회원은 종 버튼(알림함)만 둔다. 탐색은 종 버튼 왼쪽에 검색 버튼을 둔다. */}
      {isNoticeTab && (
        <div className="ml-auto flex items-center gap-1">
          {isExplore && (
            <Link
              href={APP_PATH.EXPLORE_SEARCH()}
              aria-label={EXPLORE_SEARCH_COPY.label}
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
              <HugeiconsIcon icon={Search01Icon} aria-hidden="true" />
            </Link>
          )}
          <NotificationHeaderButton />
          {showLoginButton && (
            <Link
              href={APP_PATH.LOGIN}
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'default' }),
                // 아이콘 버튼은 아이콘 양옆이 비어 보여 로그인 버튼 앞을 더 띄워 아이콘 사이와 비슷하게 보이게 한다.
                'ml-2',
              )}
              onClick={() => {
                track('client_storyList_loginButton_clicked');
              }}>
              로그인
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
