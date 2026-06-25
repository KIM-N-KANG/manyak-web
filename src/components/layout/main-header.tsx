'use client';

import Image from 'next/image';
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
        'sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 transition-colors',
        hasScrolled ? 'border-border' : 'border-transparent',
      )}>
      <Image
        src="/logo/manyak-logo.svg"
        alt="마냑"
        width={51}
        height={26}
        className="h-6 w-auto"
        priority
      />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
