import type { ChatTurnResponse } from '@/api/generated/models';

import { ChatChoices } from './chat-choices';
import { ChatMessageContent } from './chat-message-content';

type ChatTurnItemProps = {
  turn: ChatTurnResponse;
  isLast: boolean;
  onPickChoice: (text: string) => void;
};

export function ChatTurnItem({
  turn,
  isLast,
  onPickChoice,
}: ChatTurnItemProps) {
  return (
    <div>
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
