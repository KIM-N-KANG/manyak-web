import { RefreshIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';

import { canRegenerate } from '../../lib/regenerate';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '../message-content/chat-message-bubble';
import { ChatChoices } from './chat-choices';

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
        <div className="px-4 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-foreground-secondary"
            onClick={() => onRegenerate(turn)}>
            <HugeiconsIcon icon={RefreshIcon} aria-hidden="true" />
            다시 생성
          </Button>
        </div>
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
