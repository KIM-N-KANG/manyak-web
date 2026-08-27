import { BubbleChatIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { cn } from '@/lib/utils';

type StoryTurnCountProps = {
  turnCount: number;
  size?: 'sm' | 'md';
};

export function StoryTurnCount({
  turnCount,
  size = 'md',
}: StoryTurnCountProps) {
  return (
    <div
      className={cn(
        'flex h-auto items-center gap-1 rounded-full font-medium text-white',
        size === 'md'
          ? 'bg-black/70 px-3 py-1 text-sm'
          : 'bg-black/20 px-2 py-0.5 text-xs backdrop-blur-md',
      )}>
      <HugeiconsIcon
        icon={BubbleChatIcon}
        className={size === 'md' ? 'size-4' : 'size-3.5'}
        aria-hidden="true"
      />
      <p>
        <span className="sr-only">누적 턴 수 </span>
        {turnCount.toLocaleString()}
      </p>
    </div>
  );
}
