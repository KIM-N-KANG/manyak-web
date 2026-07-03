import type { Ref } from 'react';

import type { StreamingTurn } from '../types';
import { AiMessageBubble, UserMessageBubble } from './chat-message-bubble';
import { ChatStreamLoading } from './chat-stream-loading';

type ChatStreamingTurnProps = {
  turn: StreamingTurn;
  ref?: Ref<HTMLDivElement>;
};

export function ChatStreamingTurn({ turn, ref }: ChatStreamingTurnProps) {
  return (
    <div ref={ref} className="min-h-full">
      <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      {turn.aiOutput ? (
        <AiMessageBubble>{turn.aiOutput}</AiMessageBubble>
      ) : (
        <div className="p-4">
          <ChatStreamLoading />
        </div>
      )}
    </div>
  );
}
