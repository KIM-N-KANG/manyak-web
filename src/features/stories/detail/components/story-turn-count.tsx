import { BubbleChatIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

type StoryTurnCountProps = {
  turnCount: number;
};

export function StoryTurnCount({ turnCount }: StoryTurnCountProps) {
  return (
    <div className="flex h-auto items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-sm font-medium text-white backdrop-blur-md">
      <HugeiconsIcon
        icon={BubbleChatIcon}
        className="size-4"
        aria-hidden="true"
      />
      <p>
        <span className="sr-only">누적 턴 수 </span>
        {turnCount.toLocaleString()}
      </p>
    </div>
  );
}
