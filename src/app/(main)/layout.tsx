'use client';

import { type UIEvent, useState } from 'react';

import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';
import { MainScrollProvider } from '@/components/layout/main-scroll-context';
import { OnboardingRedirect } from '@/features/onboarding/components/onboarding-redirect';

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
      <MainHeader />
      {/* 스크롤 영역과 같은 박스를 가지는 positioned 래퍼.
          FAB처럼 스크롤을 따라가지 않아야 하는 오버레이가 absolute로 여기에 붙는다. */}
      <div className="relative min-h-0 flex-1">
        <div
          className="flex h-full flex-col overflow-y-auto overscroll-contain"
          onScroll={handleContentScroll}>
          <MainScrollProvider value={{ hasScrolled }}>
            {children}
          </MainScrollProvider>
        </div>
      </div>
      <BottomNavigationBar />
      <OnboardingRedirect />
    </div>
  );
}
