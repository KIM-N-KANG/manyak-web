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
  // 실시간 이미지 턴은 본문 첫 조각이 이미지보다 먼저 온다. 이미지 자리를 본문 아래에
  // 계속 두어 로딩 블록이 빠지며 앵커 아이템이 줄어드는 스크롤 점프를 막는다.
  const awaitingImage =
    turn.realtimeImage === true &&
    !turn.segments.some((segment) => segment.type === 'character-image');

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
              {awaitingImage ? (
                <div className="px-4 pt-5">
                  <ChatStreamLoading realtimeImage />
                </div>
              ) : null}
            </AiMessageBubble>
          </m.div>
        ) : (
          <m.div
            key="loading"
            // 이미지 자리 로딩은 버블(py-5)과 같은 위·아래 20px, 문구만일 때는 기존 16px.
            className={turn.realtimeImage ? 'px-4 py-5' : 'p-4'}
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
