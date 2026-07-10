'use client';

import { usePathname } from 'next/navigation';

import { getMainNavigationLabel } from '@/constants/main-navigation';

import { ManyakLogo } from './manyak-logo';

export function MainHeader() {
  const pathname = usePathname();
  const title = getMainNavigationLabel(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 bg-background px-4">
      <ManyakLogo className="h-6 w-auto text-primary" />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
