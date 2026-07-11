'use client';

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
import { useDismissOnScroll } from '@/hooks/use-dismiss-on-scroll';
import { track } from '@/observability/analytics';

export function StoryCreateCreditInfoPopover() {
  const { status } = useSession();
  const isGuest = status === 'unauthenticated';
  const [open, setOpen] = useDismissOnScroll();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      track('client_storyCreate_creditInfoButton_clicked');
    }

    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
