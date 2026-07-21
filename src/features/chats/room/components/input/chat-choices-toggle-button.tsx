'use client';

import { AiChat02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';

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
      variant={enabled ? 'primaryOutline' : 'secondary'}
      size="icon-sm"
      aria-label="추천 입력 켜기/끄기"
      aria-pressed={enabled}
      onClick={onToggle}>
      <HugeiconsIcon icon={AiChat02Icon} aria-hidden="true" />
    </Button>
  );
}
