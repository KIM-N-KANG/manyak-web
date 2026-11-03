'use client';

import { type UIEvent, useLayoutEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';
import { MainScrollProvider } from '@/components/layout/main-scroll-context';
import { PullToRefresh } from '@/components/motion/pull-to-refresh';
import { APP_PATH } from '@/constants/app-path';
import { useRefreshActiveQueries } from '@/hooks/use-refresh-active-queries';
import {
  rememberScrollPosition,
  useScrollRestoration,
} from '@/hooks/use-scroll-restoration';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isStudio = pathname === APP_PATH.MAIN.STUDIO;
  const refreshActiveQueries = useRefreshActiveQueries();
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [overlayContainer, setOverlayContainer] =
    useState<HTMLDivElement | null>(null);

  useScrollRestoration(scrollContainerRef, pathname);

  useLayoutEffect(() => {
    setHasScrolled(
      isStudio && (scrollContainerRef.current?.scrollTop ?? 0) > 0,
    );
  }, [isStudio]);

  const handleContentScroll = (event: UIEvent<HTMLElement>) => {
    const { scrollTop } = event.currentTarget;

    rememberScrollPosition(pathname, scrollTop);

    if (isStudio) setHasScrolled(scrollTop > 0);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <MainHeader />
      {/* 스크롤 영역과 같은 박스를 가지는 positioned 래퍼.
          FAB처럼 스크롤·당김을 따라가지 않아야 하는 오버레이가 포털로 여기에 absolute로 붙는다. */}
      <div ref={setOverlayContainer} className="relative min-h-0 flex-1">
        <MainScrollProvider value={{ hasScrolled, overlayContainer }}>
          <PullToRefresh
            ref={scrollContainerRef}
            onRefresh={refreshActiveQueries}
            disabled={pathname === APP_PATH.MAIN.MY}
            onScroll={handleContentScroll}
            className="h-full"
            contentClassName="flex flex-col">
            {children}
          </PullToRefresh>
        </MainScrollProvider>
      </div>
      <BottomNavigationBar />
    </div>
  );
}
