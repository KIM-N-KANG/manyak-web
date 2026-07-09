'use client';

import { type MouseEvent, useState } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useMainScroll } from '@/app/(main)/main-scroll-context';
import { APP_PATH } from '@/constants/app-path';
import { LoginRequiredDialog } from '@/features/auth/login-required/components/login-required-dialog';
import { isGuestUsageLimitReached } from '@/features/auth/login-required/utils/guest-usage-storage';
import type { GuestLimitTrigger } from '@/observability/analytics';
import { track } from '@/observability/analytics';

export function CreateStoryFab() {
  const { hasScrolled } = useMainScroll();
  const { status } = useSession();
  const [guestLimitTrigger, setGuestLimitTrigger] =
    useState<GuestLimitTrigger | null>(null);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // 이미 스토리를 만든 게스트는 생성 페이지 진입 자체를 막고 로그인을 유도한다.
    if (status !== 'authenticated' && isGuestUsageLimitReached('storyCreate')) {
      event.preventDefault();
      setGuestLimitTrigger('story_create');

      return;
    }

    track('client_storyList_createButton_clicked', { source: 'fab' });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md justify-end px-4">
      <Link
        href={APP_PATH.CREATOR.STORY}
        onClick={handleClick}
        aria-label="스토리 만들기"
        className="pointer-events-auto flex h-14 items-center rounded-full bg-primary px-4 text-primary-foreground shadow-md shadow-primary/20 transition-[filter] outline-none hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring/50">
        <HugeiconsIcon
          icon={PlusSignIcon}
          className="size-6 shrink-0"
          aria-hidden="true"
        />
        <m.span
          initial={false}
          animate={{
            width: hasScrolled ? 0 : 'auto',
            marginLeft: hasScrolled ? 0 : 6,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="inline-flex overflow-hidden">
          <span className="mr-1 text-base font-medium whitespace-nowrap">
            만들기
          </span>
        </m.span>
      </Link>
      <LoginRequiredDialog
        trigger={guestLimitTrigger}
        onOpenChange={(open) => {
          if (!open) {
            setGuestLimitTrigger(null);
          }
        }}
      />
    </div>
  );
}
