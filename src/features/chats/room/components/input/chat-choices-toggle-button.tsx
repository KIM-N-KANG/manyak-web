'use client';

import { AiChat02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChatChoicesToggleButtonProps = {
  enabled: boolean;
  onToggle: () => void;
};

export function ChatChoicesToggleButton({
  enabled,
  onToggle,
}: ChatChoicesToggleButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      aria-label="추천 입력 켜기/끄기"
      aria-pressed={enabled}
      onClick={onToggle}
      className={cn(
        enabled &&
          'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30',
      )}>
      <HugeiconsIcon icon={AiChat02Icon} aria-hidden="true" />
    </Button>
  );
}
