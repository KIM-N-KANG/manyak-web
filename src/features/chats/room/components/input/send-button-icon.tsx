'use client';

import { ArrowUp02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { PlayFilledIcon } from '@/components/icons/play-filled-icon';
import { Spinner } from '@/components/ui/spinner';

type SendButtonIconProps = {
  isStreaming: boolean;
  showsRandomSend: boolean;
};

export function SendButtonIcon({
  isStreaming,
  showsRandomSend,
}: SendButtonIconProps) {
  if (isStreaming) {
    return <Spinner aria-label="응답을 받는 중" />;
  }

  if (showsRandomSend) {
    return <PlayFilledIcon aria-hidden="true" />;
  }

  return <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" />;
}
