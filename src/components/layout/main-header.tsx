'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { getMainNavigationLabel } from '@/constants/main-navigation';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import { ManyakLogo } from './manyak-logo';

export function MainHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const title = getMainNavigationLabel(pathname);

  const showLoginButton =
    pathname === APP_PATH.MAIN.STORIES && status === 'unauthenticated';

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 bg-background px-4">
      <ManyakLogo className="h-6 w-auto text-primary" />
      <h1 className="text-lg font-semibold">{title}</h1>
      {showLoginButton && (
        <Link
          href={APP_PATH.LOGIN}
          className={cn(
            'ml-auto',
            buttonVariants({ variant: 'secondary', size: 'sm' }),
          )}
          onClick={() => track('client_storyList_loginButton_clicked')}>
          로그인
        </Link>
      )}
    </header>
  );
}
