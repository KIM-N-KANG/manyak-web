'use client';

import { type UIEvent, useState } from 'react';

import { usePathname } from 'next/navigation';

import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';
import { MainScrollProvider } from '@/components/layout/main-scroll-context';
import { PullToRefresh } from '@/components/motion/pull-to-refresh';
import { APP_PATH } from '@/constants/app-path';
import { useRefreshActiveQueries } from '@/hooks/use-refresh-active-queries';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const refreshActiveQueries = useRefreshActiveQueries();
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleContentScroll = (event: UIEvent<HTMLElement>) => {
    setHasScrolled(event.currentTarget.scrollTop > 0);
  };

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <MainHeader />
      {/* 스크롤 영역과 같은 박스를 가지는 positioned 래퍼.
          FAB처럼 스크롤을 따라가지 않아야 하는 오버레이가 absolute로 여기에 붙는다. */}
      <div className="relative min-h-0 flex-1">
        {/* 홈·채팅·제작은 당겨서 화면이 구독 중인 목록을 다시 읽는다. 마이는 앱과 같이 두지 않는다. */}
        <PullToRefresh
          onRefresh={refreshActiveQueries}
          disabled={pathname === APP_PATH.MAIN.MY}
          onScroll={handleContentScroll}
          className="h-full"
          contentClassName="flex min-h-full flex-col">
          <MainScrollProvider value={{ hasScrolled }}>
            {children}
          </MainScrollProvider>
        </PullToRefresh>
      </div>
      <BottomNavigationBar />
    </div>
  );
}
