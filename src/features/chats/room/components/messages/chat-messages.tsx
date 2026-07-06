'use client';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, m } from 'motion/react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { CHAT_HEADER_HEIGHT_CLASS } from '../../constants';
import { useChatMessageScroll } from '../../hooks/use-chat-message-scroll';
import type { StreamingTurn } from '../../types';
import { AiMessageBubble } from '../message-content/chat-message-bubble';
import { ChatChoices } from './chat-choices';
import { ChatStreamingTurn } from './chat-streaming-turn';
import { ChatTurnItem } from './chat-turn-item';

type ChatMessagesProps = {
  prologue: string;
  turns: ChatTurnResponse[];
  suggestedInputs: string[];
  streamingTurn: StreamingTurn | null;
  onSendChoice: (text: string, position: number) => void;
  onFillChoice: (text: string, position: number) => void;
  onHeaderVisibleChange: (isVisible: boolean) => void;
};

export function ChatMessages({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  onSendChoice,
  onFillChoice,
  onHeaderVisibleChange,
}: ChatMessagesProps) {
  const {
    scrollRef,
    streamingBlockRef,
    lastTurnRef,
    hasSent,
    isAtBottom,
    scrollToBottom,
    handleMessageScroll,
  } = useChatMessageScroll({
    turnCount: turns.length,
    streamingTurn,
    onHeaderVisibleChange,
  });

  const lastTurnIndex = turns.length - 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <main
        ref={scrollRef}
        onScroll={handleMessageScroll}
        className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto">
        <div aria-hidden className={cn('shrink-0', CHAT_HEADER_HEIGHT_CLASS)} />

        {prologue ? <AiMessageBubble>{prologue}</AiMessageBubble> : null}

        {turns.map((turn, index) => {
          const isLast = !streamingTurn && index === lastTurnIndex;
          const reserveSpace = isLast && hasSent;

          return (
            <ChatTurnItem
              key={turn.id ?? index}
              ref={reserveSpace ? lastTurnRef : undefined}
              turn={turn}
              isLast={isLast}
              reserveSpace={reserveSpace}
              onSendChoice={onSendChoice}
              onFillChoice={onFillChoice}
            />
          );
        })}

        {turns.length === 0 && !streamingTurn ? (
          <ChatChoices
            choices={suggestedInputs}
            onSend={onSendChoice}
            onFill={onFillChoice}
          />
        ) : null}

        {streamingTurn ? (
          <ChatStreamingTurn ref={streamingBlockRef} turn={streamingTurn} />
        ) : null}
      </main>

      <AnimatePresence initial={false}>
        {streamingTurn || !isAtBottom ? (
          <m.div
            key="scroll-to-bottom"
            className="absolute bottom-2 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={streamingTurn ? 'AI 응답 생성 중' : '맨 아래로 이동'}
              disabled={!!streamingTurn}
              onClick={() => scrollToBottom('smooth')}
              className="rounded-full bg-background/50 shadow-sm backdrop-blur-md disabled:opacity-100">
              {streamingTurn ? (
                <Spinner />
              ) : (
                <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
              )}
            </Button>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
