import type { ChatTurnResponse } from '@/api/generated/models';

import { canRegenerate } from '../../utils/regenerate';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '../message-content/chat-message-bubble';
import { ChatChoices } from './chat-choices';
import { RegenerateButton } from './regenerate-button';

type ChatTurnItemProps = {
  turn: ChatTurnResponse;
  isLast: boolean;
  onSendChoice: (text: string, position: number) => void;
  onFillChoice: (text: string, position: number) => void;
  onRegenerate: (turn: ChatTurnResponse) => void;
};

export function ChatTurnItem({
  turn,
  isLast,
  onSendChoice,
  onFillChoice,
  onRegenerate,
}: ChatTurnItemProps) {
  return (
    <div>
      {turn.userInput ? (
        <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      ) : null}
      {turn.aiOutput ? (
        <AiMessageBubble>{turn.aiOutput}</AiMessageBubble>
      ) : null}
      {isLast && canRegenerate(turn) ? (
        <RegenerateButton onClick={() => onRegenerate(turn)} />
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
