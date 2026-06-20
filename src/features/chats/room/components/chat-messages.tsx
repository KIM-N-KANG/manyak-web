'use client';

import { useRef } from 'react';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';

import { useStickyScroll } from '../hooks/use-sticky-scroll';
import { ChatMessageContent } from './chat-message-content';
import { ChatTurnItem } from './chat-turn-item';

export type StreamingTurn = { userInput: string; output: string };

type ChatMessagesProps = {
  prologue: string;
  turns: ChatTurnResponse[];
  streamingTurn: StreamingTurn | null;
  onPickChoice: (text: string) => void;
  onHasScrolledChange: (hasScrolled: boolean) => void;
};

export function ChatMessages({
  prologue,
  turns,
  streamingTurn,
  onPickChoice,
  onHasScrolledChange,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const signature = `${turns.length}:${streamingTurn?.output.length ?? -1}`;
  const { isAtBottom, scrollToBottom, handleScroll } = useStickyScroll(
    scrollRef,
    signature,
  );

  const onScroll = () => {
    handleScroll();
    onHasScrolledChange((scrollRef.current?.scrollTop ?? 0) > 0);
  };

  const lastTurnIndex = turns.length - 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <main
        ref={scrollRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto">
        {prologue ? (
          <div className="p-4">
            <ChatMessageContent>{prologue}</ChatMessageContent>
          </div>
        ) : null}

        {turns.map((turn, index) => (
          <ChatTurnItem
            key={turn.id ?? index}
            turn={turn}
            isLast={!streamingTurn && index === lastTurnIndex}
            onPickChoice={onPickChoice}
          />
        ))}

        {streamingTurn ? (
          <div>
            <div className="bg-muted p-4">
              <ChatMessageContent>{streamingTurn.userInput}</ChatMessageContent>
            </div>
            <div className="p-4">
              <ChatMessageContent>{streamingTurn.output}</ChatMessageContent>
            </div>
          </div>
        ) : null}
      </main>

      {!isAtBottom ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="맨 아래로 이동"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md">
          <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
