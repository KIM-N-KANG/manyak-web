import { BubbleChatIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

type StoryTurnCountProps = {
  turnCount: number;
};

/** 썸네일 우하단에 얹는 누적 턴 수 뱃지.
    이미지 위 오버레이라 테마와 무관하게 어두운 반투명 배경·흰 글자를 쓴다. */
export function StoryTurnCount({ turnCount }: StoryTurnCountProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
      <HugeiconsIcon
        icon={BubbleChatIcon}
        className="size-3.5"
        aria-hidden="true"
      />
      <p>
        <span className="sr-only">누적 턴 수 </span>
        {turnCount.toLocaleString()}
      </p>
    </div>
  );
}
