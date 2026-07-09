'use client';

import { useEffect, useState } from 'react';

import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GUEST_LIMITS } from '@/features/onboarding/constants';

export function StoryCreateCreditInfoPopover() {
  const { status } = useSession();
  const isGuest = status === 'unauthenticated';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnScroll = () => setOpen(false);

    window.addEventListener('scroll', closeOnScroll, true);

    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="크레딧 안내 열기"
          />
        }>
        <HugeiconsIcon icon={InformationCircleIcon} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <PopoverDescription>
          {isGuest
            ? `로그인 전에는 스토리를 ${GUEST_LIMITS.storyCreate}개까지 만들 수 있어요`
            : '스토리를 완성할 때 20크레딧이 자동으로 차감돼요'}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
