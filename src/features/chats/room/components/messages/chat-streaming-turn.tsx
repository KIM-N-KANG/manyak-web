import { useLayoutEffect, useRef } from 'react';

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
  const hasOutput = turn.segments.length > 0;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // 첫 조각이 오면 로딩 블록이 빠지며 앵커 아이템이 줄어 스크롤이 내려앉는다. 로딩이 차지하는
  // 높이를 미리 래퍼의 최소 높이로 잡아 본문이 그만큼 자랄 때까지 아이템 높이를 유지한다.
  // 응답 도착 뒤에 재면 늦다 — 자식(popLayout) 이펙트가 먼저 로딩을 흐름에서 빼고 레이아웃을
  // 강제해 그 프레임에 스크롤이 클램프된다. 그래서 로딩이 흐름에 있는 동안 잰다.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const loading = loadingRef.current;

    if (!hasOutput && wrapper && loading) {
      wrapper.style.minHeight = `${loading.offsetHeight}px`;
    }
  }, [hasOutput]);

  return (
    <div>
      <UserMessageBubble>{turn.userInput}</UserMessageBubble>
      {/* popLayout: 퇴장하는 로딩을 흐름에서 빼 본문이 같은 자리에 바로 들어오고, 로딩은 그 위에서 페이드 아웃한다. */}
      <div ref={wrapperRef} className="relative">
        <AnimatePresence mode="popLayout">
          {hasOutput ? (
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
              ref={loadingRef}
              // 문구만이든 이미지 자리든 버블(py-5)과 같은 위·아래 20px로 두어 본문 전환 시 높이가 이어진다.
              className="px-4 py-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE_OUT }}>
              <ChatStreamLoading realtimeImage={turn.realtimeImage} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
