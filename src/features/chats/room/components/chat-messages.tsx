'use client';

import { useRef, useState } from 'react';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { ChatTurnResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

import { useStickyScroll } from '../hooks/use-sticky-scroll';
import { ChatChoices } from './chat-choices';
import { ChatMessageContent } from './chat-message-content';
import { ChatStreamLoading } from './chat-stream-loading';
import { ChatTurnItem } from './chat-turn-item';

export type StreamingTurn = { userInput: string; output: string };

type ChatMessagesProps = {
  prologue: string;
  turns: ChatTurnResponse[];
  suggestedInputs: string[];
  streamingTurn: StreamingTurn | null;
  onPickChoice: (text: string, position: number) => void;
  onHasScrolledChange: (hasScrolled: boolean) => void;
};

export function ChatMessages({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  onPickChoice,
  onHasScrolledChange,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingBlockRef = useRef<HTMLDivElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const [hasSent, setHasSent] = useState(false);

  if (streamingTurn && !hasSent) {
    setHasSent(true);
  }

  const signature = `${turns.length}:${streamingTurn?.output.length ?? -1}`;
  const { isAtBottom, scrollToBottom, handleScroll } = useStickyScroll(
    scrollRef,
    signature,
    streamingTurn ? streamingBlockRef : hasSent ? lastTurnRef : null,
    streamingTurn ? 'smooth' : 'auto',
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
              onPickChoice={onPickChoice}
            />
          );
        })}

        {turns.length === 0 && !streamingTurn ? (
          <ChatChoices choices={suggestedInputs} onPick={onPickChoice} />
        ) : null}

        {streamingTurn ? (
          <div ref={streamingBlockRef} className="min-h-full">
            <div className="bg-muted p-4">
              <ChatMessageContent>{streamingTurn.userInput}</ChatMessageContent>
            </div>
            <div className="p-4">
              {streamingTurn.output ? (
                <ChatMessageContent>{streamingTurn.output}</ChatMessageContent>
              ) : (
                <ChatStreamLoading />
              )}
            </div>
          </div>
        ) : null}
      </main>

      {streamingTurn || !isAtBottom ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={streamingTurn ? 'AI 응답 생성 중' : '맨 아래로 이동'}
          disabled={!!streamingTurn}
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/50 shadow-sm backdrop-blur-md">
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
