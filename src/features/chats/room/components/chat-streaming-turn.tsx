import type { Ref } from 'react';

import type { StreamingTurn } from '../types';
import { StoryMessageBubble, UserMessageBubble } from './chat-message-bubble';
import { ChatStreamLoading } from './chat-stream-loading';

type ChatStreamingTurnProps = {
  turn: StreamingTurn;
  ref?: Ref<HTMLDivElement>;
};

export function ChatStreamingTurn({ turn, ref }: ChatStreamingTurnProps) {
  return (
    <div ref={ref} className="min-h-full">
      <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      {turn.output ? (
        <StoryMessageBubble>{turn.output}</StoryMessageBubble>
      ) : (
        <div className="p-4">
          <ChatStreamLoading />
        </div>
      )}
    </div>
  );
}
