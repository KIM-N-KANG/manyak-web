'use client';

import { AiIdeaIcon } from '@hugeicons/core-free-icons';
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
      variant="ghost"
      size="icon-sm"
      aria-label="추천 입력 켜기/끄기"
      aria-pressed={enabled}
      onClick={onToggle}
      className={cn(enabled ? 'text-primary' : 'text-foreground-secondary')}>
      <HugeiconsIcon icon={AiIdeaIcon} aria-hidden="true" />
    </Button>
  );
}
