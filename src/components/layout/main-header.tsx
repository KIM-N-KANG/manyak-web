'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { getMainNavigationLabel } from '@/constants/main-navigation';
import { startInAppLoginShortcut } from '@/features/auth/_shared/utils/in-app-login-shortcut';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import { ManyakLogo } from './manyak-logo';

export function MainHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const title = getMainNavigationLabel(pathname);
  const isHome = pathname === APP_PATH.MAIN.STORIES;

  const showLoginButton =
    status === 'unauthenticated' &&
    (isHome ||
      pathname === APP_PATH.MAIN.CHATS ||
      pathname === APP_PATH.MAIN.STUDIO);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 bg-background px-4">
      {isHome ? <ManyakLogo className="h-6 w-auto text-primary" /> : null}
      <h1 className={cn('text-xl font-semibold', isHome && 'sr-only')}>
        {title}
      </h1>
      {showLoginButton && (
        <Link
          href={APP_PATH.LOGIN}
          className={cn(
            'ml-auto',
            buttonVariants({ variant: 'secondary', size: 'default' }),
          )}
          onClick={(event) => {
            track('client_storyList_loginButton_clicked');
            startInAppLoginShortcut(event);
          }}>
          로그인
        </Link>
      )}
    </header>
  );
}
