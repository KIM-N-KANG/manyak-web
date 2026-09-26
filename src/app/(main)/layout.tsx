'use client';

import { type UIEvent, useRef, useState } from 'react';

import { usePathname } from 'next/navigation';

import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';
import { MainScrollProvider } from '@/components/layout/main-scroll-context';
import { PullToRefresh } from '@/components/motion/pull-to-refresh';
import { APP_PATH } from '@/constants/app-path';
import { StoryListToolbar } from '@/features/stories/list/components/story-list-toolbar';
import { useRefreshActiveQueries } from '@/hooks/use-refresh-active-queries';
import { cn } from '@/lib/utils';

/**
 * 홈 필터 바를 항상 펼쳐 두는 상단 구간이자 위쪽 스크롤을 무시하는 바닥 구간의 높이(px)다.
 * 필터 바는 아래로 스크롤하면 grid 행 0fr로 접힌 뒤 invisible로 포커스·보조기기에서 빠지고, 위로 스크롤하면 다시 펼쳐진다.
 * 접히면 스크롤 영역이 커져 바닥 근처의 scrollTop이 당겨지므로, 바닥 구간의 위쪽 변화는 재노출로 보지 않는다.
 * 필터 바 높이보다 크게 둔다.
 */
const TOOLBAR_SCROLL_THRESHOLD = 64;

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const refreshActiveQueries = useRefreshActiveQueries();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isToolbarHidden, setIsToolbarHidden] = useState(false);
  const lastScrollTopRef = useRef(0);
  const [overlayContainer, setOverlayContainer] =
    useState<HTMLDivElement | null>(null);

  const handleContentScroll = (event: UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const delta = scrollTop - lastScrollTopRef.current;

    lastScrollTopRef.current = scrollTop;
    setHasScrolled(scrollTop > 0);

    const isNearBottom =
      scrollHeight - clientHeight - scrollTop < TOOLBAR_SCROLL_THRESHOLD;

    if (scrollTop <= TOOLBAR_SCROLL_THRESHOLD) {
      setIsToolbarHidden(false);
    } else if (delta > 0) {
      setIsToolbarHidden(true);
    } else if (delta < 0 && !isNearBottom) {
      setIsToolbarHidden(false);
    }
  };

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <MainHeader />
      {pathname === APP_PATH.MAIN.STORIES && (
        <div
          className={cn(
            'grid shrink-0 transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none',
            isToolbarHidden ? 'invisible grid-rows-[0fr]' : 'grid-rows-[1fr]',
          )}>
          <div className="min-h-0 overflow-hidden">
            <StoryListToolbar />
          </div>
        </div>
      )}
      {/* 스크롤 영역과 같은 박스를 가지는 positioned 래퍼.
          FAB처럼 스크롤·당김을 따라가지 않아야 하는 오버레이가 포털로 여기에 absolute로 붙는다. */}
      <div ref={setOverlayContainer} className="relative min-h-0 flex-1">
        {/* 홈·채팅·제작은 당겨서 화면이 구독 중인 목록을 다시 읽는다. 마이는 앱과 같이 두지 않는다. */}
        <PullToRefresh
          onRefresh={refreshActiveQueries}
          disabled={pathname === APP_PATH.MAIN.MY}
          onScroll={handleContentScroll}
          className="h-full"
          contentClassName="flex min-h-full flex-col">
          <MainScrollProvider value={{ hasScrolled, overlayContainer }}>
            {children}
          </MainScrollProvider>
        </PullToRefresh>
      </div>
      <BottomNavigationBar />
    </div>
  );
}
