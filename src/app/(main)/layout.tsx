'use client';

import { type UIEvent, useState } from 'react';

import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';
import { OnboardingDialog } from '@/features/onboarding/components/onboarding-dialog';

import { MainScrollProvider } from './main-scroll-context';

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
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]"
        onScroll={handleContentScroll}>
        <MainScrollProvider value={{ hasScrolled }}>
          {children}
        </MainScrollProvider>
      </div>
      <BottomNavigationBar />
      <OnboardingDialog />
    </div>
  );
}
