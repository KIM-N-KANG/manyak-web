'use client';

import { type MouseEvent, useState } from 'react';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { LoginRequiredDialog } from '@/features/auth/_shared/components/login-required-dialog';
import { isGuestOverLimit } from '@/features/auth/_shared/utils/guest-usage-storage';
import type { GuestLimitTrigger } from '@/observability/analytics';
import { track } from '@/observability/analytics';

export function CreateStoryButton() {
  const { status } = useSession();
  const [guestLimitTrigger, setGuestLimitTrigger] =
    useState<GuestLimitTrigger | null>(null);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isGuestOverLimit(status, 'storyCreate')) {
      event.preventDefault();
      setGuestLimitTrigger('story_create');

      return;
    }

    track('client_storyList_createButton_clicked', { source: 'header' });
  };

  return (
    <>
      <Button
        nativeButton={false}
        render={<Link href={APP_PATH.CREATOR.STORY} onClick={handleClick} />}
        size="sm">
        만들기
      </Button>
      <LoginRequiredDialog
        trigger={guestLimitTrigger}
        onOpenChange={(open) => {
          if (!open) {
            setGuestLimitTrigger(null);
          }
        }}
      />
    </>
  );
}
