'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { getMainNavigationLabel } from '@/constants/main-navigation';
import { NoticeHeaderButton } from '@/features/notices/_shared/components/notice-header-button';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import { ManyakLogo } from './manyak-logo';

export function MainHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const title = getMainNavigationLabel(pathname);
  const isHome = pathname === APP_PATH.MAIN.STORIES;

  const isNoticeTab =
    isHome ||
    pathname === APP_PATH.MAIN.CHATS ||
    pathname === APP_PATH.MAIN.STUDIO;
  const showLoginButton = status === 'unauthenticated' && isNoticeTab;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 bg-background px-4">
      {isHome ? <ManyakLogo className="h-6 w-auto text-primary" /> : null}
      <h1 className={cn('text-xl font-semibold', isHome && 'sr-only')}>
        {title}
      </h1>
      {/* 홈, 채팅, 제작 헤더의 오른쪽 묶음. 게스트는 로그인 버튼 오른쪽에 공지 버튼을 둔다. */}
      {isNoticeTab && (
        <div className="ml-auto flex items-center gap-1">
          {showLoginButton && (
            <Link
              href={APP_PATH.LOGIN}
              className={buttonVariants({
                variant: 'secondary',
                size: 'default',
              })}
              onClick={() => {
                track('client_storyList_loginButton_clicked');
              }}>
              로그인
            </Link>
          )}
          <NoticeHeaderButton />
        </div>
      )}
    </header>
  );
}
