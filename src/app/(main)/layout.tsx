'use client';

import { type UIEvent, useLayoutEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';
import { MainScrollProvider } from '@/components/layout/main-scroll-context';
import { PullToRefresh } from '@/components/motion/pull-to-refresh';
import { APP_PATH } from '@/constants/app-path';
import { ExploreSearchBar } from '@/features/stories/_shared/components/explore-search-bar';
import { reshuffleExploreStories } from '@/features/stories/_shared/utils/explore-stories-query';
import { useRefreshActiveQueries } from '@/hooks/use-refresh-active-queries';
import {
  rememberScrollPosition,
  useScrollRestoration,
} from '@/hooks/use-scroll-restoration';

/** 탐색 검색바를 항상 보이게 두는 목록 상단 구간의 높이(px)다. 검색바 높이보다 크게 둔다. */
const SEARCH_BAR_SCROLL_THRESHOLD = 64;

/** 트랙패드 잔떨림에 검색바가 깜빡이지 않도록 한 방향으로 누적돼야 하는 스크롤 거리(px)다. */
const SEARCH_BAR_TOGGLE_DISTANCE = 8;

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isStudio = pathname === APP_PATH.MAIN.STUDIO;
  const isExplore = pathname === APP_PATH.MAIN.EXPLORE;
  const queryClient = useQueryClient();
  const refreshActiveQueries = useRefreshActiveQueries();
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isSearchBarHidden, setIsSearchBarHidden] = useState(false);
  const lastScrollTopRef = useRef(0);
  const directionDistanceRef = useRef(0);
  const [overlayContainer, setOverlayContainer] =
    useState<HTMLDivElement | null>(null);

  useScrollRestoration(scrollContainerRef, pathname);

  useLayoutEffect(() => {
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;

    lastScrollTopRef.current = scrollTop;
    directionDistanceRef.current = 0;
    setHasScrolled(isStudio && scrollTop > 0);
    setIsSearchBarHidden(isExplore && scrollTop > SEARCH_BAR_SCROLL_THRESHOLD);
  }, [isStudio, isExplore]);

  const handleContentScroll = (event: UIEvent<HTMLElement>) => {
    const { scrollTop } = event.currentTarget;

    rememberScrollPosition(pathname, scrollTop);

    if (isStudio) setHasScrolled(scrollTop > 0);

    if (!isExplore) return;

    const delta = scrollTop - lastScrollTopRef.current;

    lastScrollTopRef.current = scrollTop;

    if (Math.sign(delta) !== Math.sign(directionDistanceRef.current)) {
      directionDistanceRef.current = 0;
    }

    directionDistanceRef.current += delta;

    if (scrollTop <= SEARCH_BAR_SCROLL_THRESHOLD) {
      setIsSearchBarHidden(false);
    } else if (directionDistanceRef.current > SEARCH_BAR_TOGGLE_DISTANCE) {
      setIsSearchBarHidden(true);
    } else if (directionDistanceRef.current < -SEARCH_BAR_TOGGLE_DISTANCE) {
      setIsSearchBarHidden(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <MainHeader />
      {/* 스크롤 영역과 같은 박스를 가지는 positioned 래퍼.
          FAB처럼 스크롤·당김을 따라가지 않아야 하는 오버레이가 포털로 여기에 absolute로 붙는다. */}
      <div ref={setOverlayContainer} className="relative min-h-0 flex-1">
        <MainScrollProvider
          value={{ hasScrolled, isSearchBarHidden, overlayContainer }}>
          <PullToRefresh
            ref={scrollContainerRef}
            onRefresh={
              isExplore
                ? () => reshuffleExploreStories(queryClient)
                : refreshActiveQueries
            }
            disabled={pathname === APP_PATH.MAIN.MY}
            onScroll={handleContentScroll}
            header={isExplore ? <ExploreSearchBar /> : undefined}
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
