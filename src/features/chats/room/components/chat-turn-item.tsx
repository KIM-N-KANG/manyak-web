import type { Ref } from 'react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { cn } from '@/lib/utils';

import { ChatChoices } from './chat-choices';
import { ChatMessageContent } from './chat-message-content';

type ChatTurnItemProps = {
  turn: ChatTurnResponse;
  isLast: boolean;
  reserveSpace?: boolean;
  onPickChoice: (text: string) => void;
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
        <div className="bg-muted p-4">
          <ChatMessageContent>{turn.userInput}</ChatMessageContent>
        </div>
      ) : null}
      {turn.aiOutput ? (
        <div className="p-4">
          <ChatMessageContent>{turn.aiOutput}</ChatMessageContent>
        </div>
      ) : null}
      {isLast && turn.choices && turn.choices.length > 0 ? (
        <ChatChoices choices={turn.choices} onPick={onPickChoice} />
      ) : null}
    </div>
  );
}
