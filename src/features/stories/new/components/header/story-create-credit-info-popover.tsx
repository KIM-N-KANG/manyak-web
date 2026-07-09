'use client';

import { useEffect, useState } from 'react';

import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from '@/components/ui/popover';

export function StoryCreateCreditInfoPopover() {
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
          스토리를 완성할 때 20크레딧이 자동으로 차감돼요
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
