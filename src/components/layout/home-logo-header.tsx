import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';

import { ManyakLogo } from './manyak-logo';

export function HomeLogoHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center bg-background px-4">
      <Link href={APP_PATH.MAIN.STORIES} aria-label="홈으로 이동">
        <ManyakLogo className="h-6 w-auto text-primary" />
      </Link>
    </header>
  );
}
