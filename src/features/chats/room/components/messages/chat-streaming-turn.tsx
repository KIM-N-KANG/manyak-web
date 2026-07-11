import { AnimatePresence, m } from 'motion/react';

import type { StreamingTurn } from '../../types';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '../message-content/chat-message-bubble';
import { ChatStreamLoading } from './chat-stream-loading';

type ChatStreamingTurnProps = {
  turn: StreamingTurn;
};

export function ChatStreamingTurn({ turn }: ChatStreamingTurnProps) {
  return (
    <div>
      <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      <AnimatePresence mode="wait" initial={false}>
        {turn.aiOutput ? (
          <m.div
            key="output"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}>
            <AiMessageBubble>{turn.aiOutput}</AiMessageBubble>
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
