import { AnimatePresence, m } from 'motion/react';

import { ChatAiMessageContent } from '@/features/chats/_shared/components/chat-ai-message-content';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '@/features/chats/_shared/components/chat-message-bubble';

import type { StreamingTurn } from '../../types';
import { ChatStreamLoading } from './chat-stream-loading';

type ChatStreamingTurnProps = {
  turn: StreamingTurn;
};

export function ChatStreamingTurn({ turn }: ChatStreamingTurnProps) {
  return (
    <div>
      <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      <AnimatePresence mode="wait" initial={false}>
        {turn.segments.length > 0 ? (
          <m.div
            key="output"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}>
            <AiMessageBubble>
              <ChatAiMessageContent
                segments={turn.segments}
                imageLoading="eager"
              />
            </AiMessageBubble>
          </m.div>
        ) : (
          <m.div
            key="loading"
            className="p-4"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}>
            <ChatStreamLoading />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
