'use client';

import { type UIEvent, useLayoutEffect, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';
import { MainScrollProvider } from '@/components/layout/main-scroll-context';
import { PullToRefresh } from '@/components/motion/pull-to-refresh';
import { APP_PATH } from '@/constants/app-path';
import { useRefreshActiveQueries } from '@/hooks/use-refresh-active-queries';

/**
 * 홈 필터 바를 항상 보이게 두는 목록 상단 구간의 높이(px)다. 필터 바 높이보다 크게 둔다.
 */
const TOOLBAR_SCROLL_THRESHOLD = 64;

/** 트랙패드 잔떨림에 필터 바가 깜빡이지 않도록 한 방향으로 누적돼야 하는 스크롤 거리(px)다. */
const TOOLBAR_TOGGLE_DISTANCE = 8;

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isHome = pathname === APP_PATH.MAIN.STORIES;
  const isStudio = pathname === APP_PATH.MAIN.STUDIO;
  const refreshActiveQueries = useRefreshActiveQueries();
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isToolbarHidden, setIsToolbarHidden] = useState(false);
  const lastScrollTopRef = useRef(0);
  const directionDistanceRef = useRef(0);
  const [overlayContainer, setOverlayContainer] =
    useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;

    lastScrollTopRef.current = scrollTop;
    directionDistanceRef.current = 0;
    setHasScrolled(isStudio && scrollTop > 0);
    setIsToolbarHidden(isHome && scrollTop > TOOLBAR_SCROLL_THRESHOLD);
  }, [isHome, isStudio]);

  const handleContentScroll = (event: UIEvent<HTMLElement>) => {
    const { scrollTop } = event.currentTarget;

    if (isStudio) {
      setHasScrolled(scrollTop > 0);

      return;
    }

    const delta = scrollTop - lastScrollTopRef.current;

    lastScrollTopRef.current = scrollTop;

    if (Math.sign(delta) !== Math.sign(directionDistanceRef.current)) {
      directionDistanceRef.current = 0;
    }

    directionDistanceRef.current += delta;

    if (scrollTop <= TOOLBAR_SCROLL_THRESHOLD) {
      setIsToolbarHidden(false);
    } else if (directionDistanceRef.current > TOOLBAR_TOGGLE_DISTANCE) {
      setIsToolbarHidden(true);
    } else if (directionDistanceRef.current < -TOOLBAR_TOGGLE_DISTANCE) {
      setIsToolbarHidden(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <MainHeader />
      {/* 스크롤 영역과 같은 박스를 가지는 positioned 래퍼.
          FAB처럼 스크롤·당김을 따라가지 않아야 하는 오버레이가 포털로 여기에 absolute로 붙는다. */}
      <div ref={setOverlayContainer} className="relative min-h-0 flex-1">
        {/* 홈·채팅·제작은 당겨서 화면이 구독 중인 목록을 다시 읽는다. 마이는 앱과 같이 두지 않는다. */}
        <PullToRefresh
          ref={scrollContainerRef}
          onRefresh={refreshActiveQueries}
          disabled={pathname === APP_PATH.MAIN.MY}
          onScroll={isHome || isStudio ? handleContentScroll : undefined}
          className="h-full"
          contentClassName="flex min-h-full flex-col">
          <MainScrollProvider
            value={{ hasScrolled, isToolbarHidden, overlayContainer }}>
            {children}
          </MainScrollProvider>
        </PullToRefresh>
      </div>
      <BottomNavigationBar />
    </div>
  );
}
