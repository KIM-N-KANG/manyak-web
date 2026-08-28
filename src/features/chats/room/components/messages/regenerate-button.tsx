'use client';

import { Refresh04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';

import { Button } from '@/components/ui/button';

type RegenerateButtonProps = {
  onClick: () => void;
};

export function RegenerateButton({ onClick }: RegenerateButtonProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="-ml-1 px-4 pb-5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="다시 생성"
        className="text-foreground-secondary"
        onClick={onClick}>
        <HugeiconsIcon icon={Refresh04Icon} aria-hidden="true" />
      </Button>
    </m.div>
  );
}
