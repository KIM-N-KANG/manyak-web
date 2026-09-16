import { AnimatePresence, m, useReducedMotion } from 'motion/react';

import { ChatAiMessageContent } from '@/features/chats/_shared/components/chat-ai-message-content';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '@/features/chats/_shared/components/chat-message-bubble';
import { EASE_OUT } from '@/lib/ease';

import type { StreamingTurn } from '../../types';
import { ChatStreamLoading } from './chat-stream-loading';

type ChatStreamingTurnProps = {
  turn: StreamingTurn;
  onCharacterImageZoom: () => void;
};

export function ChatStreamingTurn({
  turn,
  onCharacterImageZoom,
}: ChatStreamingTurnProps) {
  const reduce = useReducedMotion();

  return (
    <div>
      <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      <AnimatePresence mode="wait">
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
                onCharacterImageZoom={onCharacterImageZoom}
              />
            </AiMessageBubble>
          </m.div>
        ) : (
          <m.div
            key="loading"
            className="p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE_OUT }}>
            <ChatStreamLoading realtimeImage={turn.realtimeImage} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
