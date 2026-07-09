'use client';

import { useState } from 'react';

import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from '@/components/ui/popover';

type ChatCreditInfoPopoverProps = {
  isHeaderVisible: boolean;
};

export function ChatCreditInfoPopover({
  isHeaderVisible,
}: ChatCreditInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [prevHeaderVisible, setPrevHeaderVisible] = useState(isHeaderVisible);

  // 헤더가 사라지면 열려 있던 팝오버도 함께 닫습니다.
  if (prevHeaderVisible !== isHeaderVisible) {
    setPrevHeaderVisible(isHeaderVisible);

    if (!isHeaderVisible) {
      setOpen(false);
    }
  }

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
          채팅을 한 번 보낼 때마다 10크레딧이 자동으로 차감돼요
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
