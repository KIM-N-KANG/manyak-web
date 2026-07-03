'use client';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

import { useChatMessageScroll } from '../hooks/use-chat-message-scroll';
import { CHAT_HEADER_HEIGHT_CLASS } from '../lib/constants';
import type { StreamingTurn } from '../types';
import { ChatChoices } from './chat-choices';
import { StoryMessageBubble } from './chat-message-bubble';
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

        {prologue ? <StoryMessageBubble>{prologue}</StoryMessageBubble> : null}

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

      {streamingTurn || !isAtBottom ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={streamingTurn ? 'AI 응답 생성 중' : '맨 아래로 이동'}
          disabled={!!streamingTurn}
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/50 shadow-sm backdrop-blur-md disabled:opacity-100">
          {streamingTurn ? (
            <Spinner />
          ) : (
            <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
          )}
        </Button>
      ) : null}
    </div>
  );
}
