import type { Ref } from 'react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { cn } from '@/lib/utils';

import {
  AiMessageBubble,
  UserMessageBubble,
} from '../message-content/chat-message-bubble';
import { ChatChoices } from './chat-choices';

type ChatTurnItemProps = {
  turn: ChatTurnResponse;
  isLast: boolean;
  reserveSpace?: boolean;
  onSendChoice: (text: string, position: number) => void;
  onFillChoice: (text: string, position: number) => void;
  ref?: Ref<HTMLDivElement>;
};

export function ChatTurnItem({
  turn,
  isLast,
  reserveSpace,
  onSendChoice,
  onFillChoice,
  ref,
}: ChatTurnItemProps) {
  return (
    <div ref={ref} className={cn(reserveSpace && 'min-h-full')}>
      {turn.userInput ? (
        <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      ) : null}
      {turn.aiOutput ? (
        <AiMessageBubble>{turn.aiOutput}</AiMessageBubble>
      ) : null}
      {isLast && turn.choices && turn.choices.length > 0 ? (
        <ChatChoices
          choices={turn.choices}
          onSend={onSendChoice}
          onFill={onFillChoice}
        />
      ) : null}
    </div>
  );
}
