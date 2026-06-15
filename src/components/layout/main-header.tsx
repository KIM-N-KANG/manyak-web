'use client';

import { useEffect, useState } from 'react';

import { usePathname } from 'next/navigation';

import { APP_PATH, type MainAppPath } from '@/constants/app-path';
import { cn } from '@/lib/utils';

const MAIN_HEADER_TITLE_BY_PATH: Record<MainAppPath, string> = {
  [APP_PATH.MAIN.STORIES]: '스토리',
  [APP_PATH.MAIN.CHATS]: '채팅',
};

export function MainHeader() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const pathname = usePathname();
  const title = MAIN_HEADER_TITLE_BY_PATH[pathname as MainAppPath] ?? '';

  useEffect(() => {
    const updateHasScrolled = () => {
      setHasScrolled(window.scrollY > 0);
    };

    updateHasScrolled();
    window.addEventListener('scroll', updateHasScrolled, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateHasScrolled);
    };
  }, []);

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
