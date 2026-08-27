import type { ChatTurnResponse } from '@/api/generated/models';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '@/features/chats/_shared/components/chat-message-bubble';

import type { ChoicesStatus } from '../../hooks/use-chat-choices';
import { canRegenerate } from '../../utils/regenerate';
import { ChatChoices } from './chat-choices';
import { ChatChoicesStatus } from './chat-choices-status';
import { RegenerateButton } from './regenerate-button';

type ChatTurnItemProps = {
  turn: ChatTurnResponse;
  isLast: boolean;
  choicesEnabled: boolean;
  choicesStatus: ChoicesStatus | null;
  onSendChoice: (text: string, position: number, sourceTurnId?: number) => void;
  onFillChoice: (text: string, position: number, sourceTurnId?: number) => void;
  onRegenerate: (turn: ChatTurnResponse) => void;
  onRetryChoices: () => void;
};

export function ChatTurnItem({
  turn,
  isLast,
  choicesEnabled,
  choicesStatus,
  onSendChoice,
  onFillChoice,
  onRegenerate,
  onRetryChoices,
}: ChatTurnItemProps) {
  return (
    <div>
      {turn.userInput ? (
        <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      ) : null}
      {turn.aiOutput ? (
        <AiMessageBubble endingName={turn.reachedEnding}>
          {turn.aiOutput}
        </AiMessageBubble>
      ) : null}
      {isLast && canRegenerate(turn) ? (
        <RegenerateButton onClick={() => onRegenerate(turn)} />
      ) : null}
      {isLast && choicesEnabled && turn.choices && turn.choices.length > 0 ? (
        <ChatChoices
          choices={turn.choices}
          sourceTurnId={turn.id ?? undefined}
          onSend={onSendChoice}
          onFill={onFillChoice}
        />
      ) : isLast &&
        choicesStatus !== null &&
        choicesStatus.turnId === turn.id ? (
        <ChatChoicesStatus
          status={choicesStatus.status}
          onRetry={onRetryChoices}
        />
      ) : null}
    </div>
  );
}
