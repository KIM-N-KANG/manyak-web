'use client';

import { type UIEvent, useState } from 'react';

import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleContentScroll = (event: UIEvent<HTMLDivElement>) => {
    setHasScrolled(event.currentTarget.scrollTop > 0);
  };

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <MainHeader hasScrolled={hasScrolled} />
      <div
        className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto pb-16"
        onScroll={handleContentScroll}>
        {children}
      </div>
      <BottomNavigationBar />
    </div>
  );
}
