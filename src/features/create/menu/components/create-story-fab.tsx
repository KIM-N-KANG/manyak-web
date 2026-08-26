'use client';

import { type MouseEvent, useState } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useMainScroll } from '@/components/layout/main-scroll-context';
import { APP_PATH } from '@/constants/app-path';
import { LoginRequiredDialog } from '@/features/auth/_shared/components/login-required-dialog';
import { isGuestOverLimit } from '@/features/auth/_shared/utils/guest-usage-storage';
import type { GuestLimitTrigger } from '@/observability/analytics';
import { track } from '@/observability/analytics';

import { CREATE_STORY_FAB_COPY } from '../constants';

export function CreateStoryFab() {
  const { hasScrolled } = useMainScroll();
  const { status } = useSession();
  const [guestLimitTrigger, setGuestLimitTrigger] =
    useState<GuestLimitTrigger | null>(null);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isGuestOverLimit(status, 'storyCreate')) {
      event.preventDefault();
      setGuestLimitTrigger('story_create');

      return;
    }

    track('client_storyList_createButton_clicked', { source: 'fab' });
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-end px-4">
      <Link
        href={APP_PATH.CREATOR.STORY}
        onClick={handleClick}
        aria-label={CREATE_STORY_FAB_COPY.accessibleLabel}
        className="pointer-events-auto flex h-14 items-center rounded-full bg-primary px-4 text-primary-foreground shadow-md shadow-primary/20 transition-transform outline-none hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:scale-100">
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
            {CREATE_STORY_FAB_COPY.label}
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
