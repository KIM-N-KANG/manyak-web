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

export function ChatCreditInfoPopover() {
  const { status } = useSession();
  const isGuest = status === 'unauthenticated';
  const [open, setOpen] = useDismissOnScroll();

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
            ? `로그인 전에는 채팅방 전체에서 ${GUEST_LIMITS.chat}번까지 대화할 수 있어요`
            : '채팅을 한 번 보낼 때마다 10크레딧이 자동으로 차감돼요'}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
