import type { Ref } from 'react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { cn } from '@/lib/utils';

import { ChatChoices } from './chat-choices';
import { StoryMessageBubble, UserMessageBubble } from './chat-message-bubble';

type ChatTurnItemProps = {
  turn: ChatTurnResponse;
  isLast: boolean;
  reserveSpace?: boolean;
  onPickChoice: (text: string, position: number) => void;
  ref?: Ref<HTMLDivElement>;
};

export function ChatTurnItem({
  turn,
  isLast,
  reserveSpace,
  onPickChoice,
  ref,
}: ChatTurnItemProps) {
  return (
    <div ref={ref} className={cn(reserveSpace && 'min-h-full')}>
      {turn.userInput ? (
        <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      ) : null}
      {turn.aiOutput ? (
        <StoryMessageBubble>{turn.aiOutput}</StoryMessageBubble>
      ) : null}
      {isLast && turn.choices && turn.choices.length > 0 ? (
        <ChatChoices choices={turn.choices} onPick={onPickChoice} />
      ) : null}
    </div>
  );
}
