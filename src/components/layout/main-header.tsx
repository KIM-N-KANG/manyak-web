'use client';

import { usePathname } from 'next/navigation';

import { getMainNavigationLabel } from '@/constants/main-navigation';
import { cn } from '@/lib/utils';

type MainHeaderProps = {
  hasScrolled?: boolean;
};

export function MainHeader({ hasScrolled = false }: MainHeaderProps) {
  const pathname = usePathname();
  const title = getMainNavigationLabel(pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-16 items-center border-b bg-background px-4 transition-colors',
        hasScrolled ? 'border-border' : 'border-transparent',
      )}>
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  );
}
