'use client';

import { useEffect, useRef, useState } from 'react';

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
  onHeaderVisibleChange: (isVisible: boolean) => void;
};

export function ChatMessages({
  prologue,
  turns,
  suggestedInputs,
  streamingTurn,
  onPickChoice,
  onHeaderVisibleChange,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingBlockRef = useRef<HTMLDivElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const [hasSent, setHasSent] = useState(false);
  // 대화가 없는 갓 생성된 채팅으로 진입했는지(마운트 시점 기준).
  // 이 경우 하단 고정 대신 최상단에서 시작해 프롤로그를 처음부터 읽게 한다.
  const [startedEmpty] = useState(() => turns.length === 0 && !streamingTurn);

  if (streamingTurn && !hasSent) {
    setHasSent(true);
  }

  const signature = `${turns.length}:${streamingTurn?.output.length ?? -1}`;
  const { isAtBottom, scrollToBottom, handleScroll } = useStickyScroll(
    scrollRef,
    signature,
    streamingTurn ? streamingBlockRef : hasSent ? lastTurnRef : null,
    streamingTurn ? 'smooth' : 'auto',
    !startedEmpty,
  );

  // 빈 채팅(최상단 시작)에서 첫 메시지를 보내면 하단 고정을 다시 켜
  // 사용자의 메시지와 스트리밍 응답을 따라가게 한다.
  useEffect(() => {
    if (hasSent && startedEmpty) {
      scrollToBottom('smooth');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSent]);

  const onScroll = () => {
    handleScroll();

    const current = scrollRef.current?.scrollTop ?? 0;
    const delta = current - lastScrollTopRef.current;
    const isAtTop = current <= 8;

    if (isAtTop) {
      onHeaderVisibleChange(true);
    } else if (delta > 4) {
      onHeaderVisibleChange(false);
    } else if (delta < -4) {
      onHeaderVisibleChange(true);
    }

    lastScrollTopRef.current = current;
  };

  const lastTurnIndex = turns.length - 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <main
        ref={scrollRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto">
        <div aria-hidden className="h-14 shrink-0" />

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
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/50 shadow-sm backdrop-blur-md disabled:opacity-100">
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
